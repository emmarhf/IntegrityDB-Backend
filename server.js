// Importar express y supabase
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const port = 3000;

// Configurar Supabase con la URL y clave pública que proporcionaste
const supabase = createClient('https://mtjcxaoomoymuttvtrzp.supabase.co', 
                              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10amN4YW9vbW95bXV0dHZ0cnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjYyNDMsImV4cCI6MjA1ODkwMjI0M30.P11fBpCkrAzGOmL8PdcuKN_iXZSsH6qXEwdDAP2k4GM');

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

// Ruta para verificar la compatibilidad entre procesador y RAM
app.post('/verificar-compatibilidad', async (req, res) => {
  const { idProcesador, idRam } = req.body; // Recibe las IDs del procesador y la RAM seleccionados

  if (!idProcesador || !idRam) {
    return res.status(400).send('Faltan datos de procesador o RAM');
  }

  try {
    // Verificar la compatibilidad en Supabase
    const { data, error } = await supabase
      .from('compatibilidad') // Nombre de la tabla
      .select('*')
      .eq('tipo_componente', 'procesador') // Verificamos si el tipo es procesador
      .eq('componente_id', idProcesador) // ID del procesador seleccionado
      .eq('tipo_componente_compatible', 'ram') // Verificamos si el componente compatible es RAM
      .eq('componente_compatible_id', idRam); // ID de la RAM seleccionada

    if (error || !data.length) {
      // Si no se encuentran resultados o hay un error, la combinación no es compatible
      return res.status(400).json({ message: 'Esta combinación de componentes no es compatible.' });
    }

    // Si la combinación es válida
    return res.status(200).json({ message: 'Combinación válida.' });

  } catch (err) {
    return res.status(500).json({ message: 'Hubo un error al verificar la compatibilidad.' });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
