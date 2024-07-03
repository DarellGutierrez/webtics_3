const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');

require('dotenv').config();
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Conectar a MongoDB
const uridb = `mongodb+srv://DarellGutierrez:bLanBGeJYLIVqRLl@proyectotic.7p0eur3.mongodb.net/?retryWrites=true&w=majority&appName=ProyectoTIC`;
mongoose.connect(uridb) //borré useNewUrlParser y useUnifiedTopology ya que no se usan en las nuevas versiones de node
.then(() => console.log("base de datos conectada")) 
.catch(e => console.log(e))

// Configurar express-session para manejar sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'mysecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 día
    }
}));

// Definir esquemas
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

const dataSchema = new mongoose.Schema({
    temperatura: Number,
    humedad: Number,
    metano: Number,
    ambiente: Number,
    luz: Number,
    time: String
});
const Data = mongoose.model('Data', dataSchema);

// Dirección de archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/overview', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'overview.html'));
    } else {
        res.redirect('/login');
    }
});

app.get('/statistics', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'statistics.html'));
    } else {
        res.redirect('/login');
    }
});

app.post('/sign_user', async (req, res) => {
    const { username, password1, password2 } = req.body;

    if (!username || !password1 || !password2) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    if (password1 !== password2) {
        return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
    }

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'El usuario ya existe.' });
        }

        const hashedPassword = await bcrypt.hash(password1, 10); // Hash the password
        const newUser = new User({
            username,
            password: hashedPassword,
        });

        await newUser.save();
        res.status(200).json({ message: 'Usuario registrado con éxito' });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el usuario: ' + error.message });
    }
});

app.post('/log_user', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).send('Usuario o contraseña incorrectos.');
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).send('Usuario o contraseña incorrectos.');
        }

        // Iniciar sesión y almacenar el usuario en la sesión
        req.session.user = user;
        res.status(200).send('Inicio de sesión exitoso');
    } catch (error) {
        res.status(500).send('Error al iniciar sesión: ' + error.message);
    }
});

app.get('/exit', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error al cerrar sesión: ' + err.message);
        }
        res.redirect('/home');
    });
});

app.get('/showUsers', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
});

// Variables:
app.post('/addData', async (req, res) => {
    const { temperatura, humedad, metano, ambiente, luz } = req.body;
    const currentTime = new Date().toLocaleString();

    luz = 3038.18 - 2.41 * luz;

    try {
        // Save the data to the database
        await Data.create({
            temperatura,
            humedad,
            metano,
            ambiente,
            luz,
            time: currentTime
        });

        res.status(200).json({ message: 'Data added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error adding data: ' + error.message });
    }
});

// Get latest data:
app.get('/getLatestData', (req, res) => {
    // Find the latest entry in the Data collection
    Data.findOne().sort({ _id: -1 }).limit(1)
        .then((latestData) => {
            if (latestData) {
                // If data is found, return it as JSON response
                res.status(200).json({
                    temperatura: latestData.temperatura,
                    humedad: latestData.humedad,
                    metano: latestData.metano,
                    ambiente: latestData.ambiente,
                    luz: latestData.luz
                });
            } else {
                // If no data is found, return a 404 error
                res.status(404).json({ error: 'No data found' });
            }
        })
        .catch((error) => {
            // If there's an error, return a 500 error
            res.status(500).json({ error: 'Error fetching data: ' + error.message });
        });
});

app.post('/addExampleData', (req, res) => {
    const currentTime = new Date().toLocaleString();

    const randomData = {
        temperatura: Math.random() * 40, 
        humedad: Math.random() * 90 + 10,    
        metano: Math.random() * 700 + 100,   
        ambiente: Math.random() * 700 + 100, 
        luz: Math.random() * 50 + 50      
    };

    Data.create({
        temperatura: randomData.temperatura,
        humedad: randomData.humedad,
        metano: randomData.metano,
        ambiente: randomData.ambiente,
        luz: randomData.luz,
        time: currentTime
    })
    .then(() => {
        res.status(200).json({ message: 'Random data added successfully' });
    })
    .catch((error) => {
        res.status(500).json({ error: 'Error adding random data: ' + error.message });
    });
});

app.get('/showData', async (req, res) => {
    try {
        const allData = await Data.find();

        const data = {
            temperatura: [],
            humedad: [],
            metano: [],
            ambiente: [],
            luz: []
        };

        allData.forEach(entry => {
            data.temperatura.push({ time: entry.time, value: entry.temperatura });
            data.humedad.push({ time: entry.time, value: entry.humedad });
            data.metano.push({ time: entry.time, value: entry.metano });
            data.ambiente.push({ time: entry.time, value: entry.ambiente });
            data.luz.push({ time: entry.time, value: entry.luz });
        });

        res.json(data);
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json({ message: 'Error retrieving data' });
    }
});

app.delete('/deleteAllUsers', async (req, res) => {
    try {
        await User.deleteMany({});
        res.status(200).json({ message: 'All users deleted successfully' });
    } catch (error) {
        console.error('Error deleting users:', error);
        res.status(500).json({ message: 'Error deleting users' });
    }
});

app.delete('/deleteAllData', async (req, res) => {
    try {
        await Data.deleteMany({});
        res.status(200).json({ message: 'All data deleted successfully' });
    } catch (error) {
        console.error('Error deleting users:', error);
        res.status(500).json({ message: 'Error deleting users' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
