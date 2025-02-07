const express = require('express');

const router = express.Router();

const Cart = require('../models/cart');

const User = require('../models/user');

const Product = require('../models/product');

const Utils = require('../utils/utils');

router.get('/getCart', async (req, res) => {
    var cartID = req.cookies["CARTID"];
    var session = req.cookies["SESSIONID"];
    var userCart = null;
    var user = null;

    if (session) {
        user = await User.findOne({
            nickname: session
        });
        if (user) {
            userCart = await Cart.findOne({
                id: user.cartID
            });
        }
    }

    if (cartID) {
        var carrito = await Cart.findOne({
            id: cartID
        });

        if (carrito) {
            if (userCart) {
                //Fusionar carritos
                if (userCart.id !== cartID) {
                    //Fusión de productos
                    carrito.products.forEach(producto => {
                        var existeProducto = userCart.products.some(p => p.sku === producto.sku);
                        if (existeProducto) {
                            var indexProducto = userCart.products.findIndex(p => p.sku === producto.sku);
                            userCart.products[indexProducto].qty += producto.qty;
                        } else {
                            userCart.products.push(producto);
                        }
                    });

                    userCart.quantity += carrito.quantity;
                    userCart.total += carrito.total;

                    var issues = await Utils.validateCart(userCart);
                    userCart = issues;

                    res.cookie('CARTID', userCart.id, {
                        expires: new Date(2025, 1, 1)
                    });

                    //userCart = userCart.cart.toObject();
                    //delete userCart._id;
                    //delete userCart.__v;

                    return res.send(userCart);
                }
            }

            var issues = await Utils.validateCart(carrito);
            carrito = issues;

            //carrito = carrito.toObject();
            //delete carrito._id;
            //delete carrito.__v;
            return res.send(carrito);
        } else if (user && userCart) {
            res.cookie('CARTID', userCart.id, {
                expires: new Date(2025, 1, 1)
            });

            var issues = await Utils.validateCart(userCart);
            userCart = issues;

            return res.send(userCart);
        }
    } else {
        if (user && userCart) {
            res.cookie('CARTID', userCart.id, {
                expires: new Date(2025, 1, 1)
            });
            var issues = await Utils.validateCart(userCart);
            userCart = issues;

            return res.send(userCart);
        }

        cartID = Utils.genCartID();
        res.cookie('CARTID', cartID, {
            expires: new Date(2025, 1, 1)
        });
    }

    carrito = new Cart({
        id: cartID,
        products: [],
        quantity: 0,
        total: 0
    });

    await carrito.save();

    if (user && !userCart) {
        user.cartID = cartID;
        await user.save();
    }

    carrito = carrito.toObject();
    delete carrito._id;
    delete carrito.__v;
    res.send(carrito);

});

router.put('/viewCart', async (req, res) => {
    const cartID = req.body.cartID;
    var cart = await Cart.findOne({
        id: cartID
    }, {
        _id: 0,
        __v: 0
    });

    if (cart) {
        return res.send(cart);
    }

    res.status(404).send({
        error: "El carrito: " + cartID + " no existe"
    });
});

router.patch('/add', async (req, res) => {
    var producto = req.body;
    var cartID = req.cookies["CARTID"];
    var carrito = null;

    if (!producto.sku || !producto.qty) {
        return res.status(400).send({
            message: "Debe incluir el sku y el qty en la petición"
        });
    }

    var qty = parseInt(producto.qty);
    if (isNaN(qty) || qty < 1) {
        return res.status(400).send({
            message: "producto.qty debe ser un número entero mayor o igual a 1"
        });
    }

    producto.qty = qty;

    //Añadir el producto al carrito...
    //Cuál carrito?
    carrito = await Cart.findOne({
        id: cartID
    });

    if (!carrito) {
        return res.status(400).send({
            message: "No existe un carrito asociado a esta petición... Ejecute el endpoint /carts/getCart"
        });
    }

    var productoAñadir = await Product.findOne({
        sku: producto.sku
    });
    if (productoAñadir) {
        //En el Cart.products se guardará lo siguiente:
        /**
         * {
         *    sku: "123",
         *    name: "Producto nombre",
         *    description: "Producto descripción"
         *    qty: 1,
         *    unit_price: 15.4
         * }
         */
        var existeEnCarrito = carrito.products.some(p => p.sku === productoAñadir.sku);
        if (existeEnCarrito) {
            //Actualizar el qty del producto en el carrito
            var productoCarrito = carrito.products.findIndex(p => p.sku === productoAñadir.sku);
            carrito.products[productoCarrito].qty += producto.qty;
        } else {
            //Añadir este producto al carrito
            carrito.products.push({
                sku: productoAñadir.sku,
                name: productoAñadir.name,
                description: productoAñadir.description,
                qty: producto.qty,
                unit_price: productoAñadir.price,
                images: productoAñadir.images
            });
        }

        carrito.quantity += producto.qty;
        carrito.total += producto.qty * productoAñadir.price;

        carrito.markModified('products');
        await carrito.save();
    }

    carrito = carrito.toObject();
    delete carrito._id;
    delete carrito.__v;
    return res.send(carrito);

});

router.patch('/remove', async (req, res) => {
    var datoProducto = req.body;
    var cartID = req.cookies["CARTID"];
    var carrito = null;

    datoProducto.all = datoProducto.all === true || datoProducto.all === 'true';

    
    if (!datoProducto.sku && (!datoProducto.qty || !datoProducto.all)) {
        return res.status(400).send({
            message: "Debe especificar el sku del producto, qty a eliminar, o all: true"
        })
    }

    if (datoProducto.qty) {
        datoProducto.qty = parseInt(datoProducto.qty);
        if (isNaN(datoProducto.qty) || datoProducto.qty < 1) {
            return res.status(400).send({
                message: "producto.qty debe ser un número entero mayor o igual a 1"
            });
        }
    }

    carrito = await Cart.findOne({
        id: cartID
    });

    if (!carrito) {
        return res.status(400).send({
            message: "No existe un carrito asociado a esta petición... Ejecute el endpoint /carts/getCart"
        });
    }

    var productoExiste = carrito.products.some(prod => prod.sku === datoProducto.sku);
    if (productoExiste) {
        const i = carrito.products.findIndex(prod => prod.sku === datoProducto.sku);
        const producto = carrito.products[i];

        if (datoProducto.all === true || producto.qty <= datoProducto.qty) {
            //Eliminar por completo el producto del carrito
            carrito.quantity -= producto.qty;
            carrito.total -= producto.unit_price * producto.qty;
            carrito.products.splice(i, 1);
        } else if (producto.qty > datoProducto.qty) {
            producto.qty -= datoProducto.qty;
            carrito.quantity -= datoProducto.qty;
            carrito.total -= producto.unit_price * datoProducto.qty;
        }
    }

    carrito.markModified('products');
    await carrito.save();

    var carritoFinal = carrito.toObject();
    delete carritoFinal._id;
    delete carritoFinal.__v;

    res.send(carritoFinal);

    /*var numeros = [1,2,3,4,5,6,7,8,9,10];
    var existeCinco = numeros.includes(5);
    var cincoExiste = numeros.some(num => num === 5);*/
});

router.patch('/cleanCart', async (req, res) => {
    var cartID = req.cookies["CARTID"];
    var carrito = await Cart.findOne({
        id: cartID
    });

    if (!carrito) {
        return res.status(400).send({
            message: "No existe un carrito asociado a esta petición... Ejecute el endpoint /carts/getCart"
        });
    }

    carrito.products = [];
    carrito.quantity = 0;
    carrito.total = 0;

    carrito.markModified('products');
    await carrito.save();

    res.send(carrito);
});

router.put('/validateCart', async (req, res) => {
    var cartID = req.cookies["CARTID"];
    var carrito = await Cart.findOne({
        id: cartID
    });

    if (!carrito) {
        return res.status(400).send({
            message: "No existe un carrito asociado a esta petición... Ejecute el endpoint /carts/getCart"
        });
    }

    var cart_issues = [];
   
    for (var i = 0; i < carrito.products.length; i++) {
        const product = carrito.products[i];

        
        var productDB = await Product.findOne({
            sku: product.sku
        });

        
        if (!productDB) {
            cart_issues.push({
                product: {
                    sku: product.sku,
                    name: product.name
                },
                issue: "Este producto ha sido dado de baja del catálogo"
            });

            
            carrito.products.splice(i, 1);
            i--;
            continue;
        } else {
            if (productDB.stock <= 0) {
                cart_issues.push({
                    product: {
                        sku: product.sku,
                        name: product.name
                    },
                    issue: "Este producto no tiene stock por el momento"
                });

                carrito.products.splice(i, 1);
                i--;
                continue;
            } else if (productDB.stock < product.qty) {
                cart_issues.push({
                    product: {
                        sku: product.sku,
                        name: product.name
                    },
                    issue: "Este producto no tiene suficiente stock. Se le ha modificado al máximo existente"
                });
            }
        }

        product.name = productDB.name;
        product.description = productDB.description;
        product.unit_price = productDB.price;
        product.images = productDB.images;
    }

    carrito.quantity = 0;
    carrito.total = 0;
    for (var i = 0; i < carrito.products.length; i++) {
        const product = carrito.products[i];
        carrito.quantity += product.qty;
        carrito.total += product.qty * product.unit_price;
    }

    carrito.markModified('products');
    await carrito.save();

    res.send(cart_issues);

});



module.exports = router;