const fs = require('fs')
const path = require('path')

const express = require('express');
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

const HttpError = require('./models/http-error')

const placesRoutes = require('./routes/places-routes')
const usersRoutes = require('./routes/users-routes')

const app = express()

app.use(bodyParser.json())

app.use('/uploads/images', express.static(path.join('uploads', 'images')))

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
    next()
})

app.use('/api/users', usersRoutes)
app.use('/api/places', placesRoutes)

app.use((req, res, next) => {
    const err = new HttpError("Could not find this route.", 404)
    throw err
})

app.use((err, req, res, next) => {
    if(req.file){
        fs.unlink(req.file.path, (err) => {
            console.log(err)
        })
    }
    if (res.headerSent) {
        return next(err);
    }

    res.status(err.code || 500);
    res.json({ message: err.message || "An unknown error occurred" })
})

mongoose
    .connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@realmcluster.q24p7.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`)
    .then(() => {
        app.listen(process.env.PORT || 5000)
    })
    .catch(err => {
        console.log(err)
    })
