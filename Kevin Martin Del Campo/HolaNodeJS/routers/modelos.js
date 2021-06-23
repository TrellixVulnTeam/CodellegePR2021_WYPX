const express = require('express');
const router = express.Router();

const Mascota = require('../models/mascota');

router.post('/dummy/:tipo', async function(req, res){
    var tipoModelo = req.params.tipo;

    switch(tipoModelo) {
        case "mascota":
            var mascota = new Mascota({
                nombre: "Lucky",
                raza: "Chihuahua",
                edad: 7,
                fechaNac: new Date(),
                dueño: "Marisol"
            });

            await mascota.save();
        break;
    }

    res.send('Creado correctamente el tipo: ' + tipoModelo);
});

router.get('/all/:tipo', async function(req, res){
    var tipoModelo = req.params.tipo;

    switch(tipoModelo) {
        case "mascota":
            var mascotas = await Mascota.find({});
            
            var mascota = await Mascota.findOne({nombre: "Lucky"});
            if(mascota) { //null o el valor

            }

            mascota.edad += 1;
            await mascota.save();
            
            res.send(mascotas);
        break;
    }
});

module.exports = router;