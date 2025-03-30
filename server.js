// Importar express
const express = require('express');
const app = express();
const port = 3000;

// Middleware para procesar el cuerpo de las solicitudes en formato JSON
app.use(express.json());

// Ruta de confirmación de ejemplo
app.get('/', (req, res) => {
  res.send('¡Servidor funcionando!');
});

// Ruta para confirmar el procesamiento de datos (ejemplo sencillo)
app.post('/api/confirmar', (req, res) => {
  const { nombre, precio } = req.body;

  if (!nombre || !precio) {
    return res.status(400).send('Faltan datos');
  }

  res.status(200).send(`Componente ${nombre} con precio $${precio} recibido correctamente.`);
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
