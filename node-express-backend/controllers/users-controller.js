const { v4: uuid } = require('uuid')
const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const HttpError = require('../models/http-error')
const User = require('../models/user')

exports.getUsers = async (req, res, next) => {
    let users
    try {
        users = await User.find({}, '-password')
    } catch (err) {
        const error = new HttpError('Error finding users, please try again', 500)
        return next(error)
    }

    res.json({ users: users.map(u => u.toObject({ getters: true })) })
}

exports.getUserById = async (req, res, next) => {
    const userId = req.params.uid;
    let user
    try {
        user = await User.findById(userId, '-password')
        console.log(user)
    } catch (err) {
        const error = new HttpError('Error finding user, please try again', 500)
        return next(error)
    }

    res.json({ user: user.toObject({ getters: true })})
}

exports.signupUser = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return next(new HttpError('Invalid inputs, please check your data', 422))
    }

    const { name, email, password } = req.body

    let existingUser
    try {
        existingUser = await User.findOne({ email: email })
    } catch (err) {
        const error = new HttpError('Could not sign up user. Try again', 500)
        return next(error)
    }

    if (existingUser) {
        const error = new HttpError('User already exists, please sign in', 422)
        return next(error)
    }

    let hashedPassword
    try {
        hashedPassword = await bcrypt.hash(password, 12)

    } catch (err) {
        const error = new HttpError("Could not create user, please try again", 500)
        return next(error)
    }

    const createdUser = new User({
        name,
        email,
        image: req.file.path,
        password: hashedPassword,
        places: []
    })

    try {
        await createdUser.save()
    } catch (err) {
        const error = new HttpError('Something went wrong signing up user', 500)
        return next(error)
    }

    let token;
    try {
        token = jwt.sign({ userId: createdUser.id, email: createdUser.email }, process.env.PRIVATE_TOKEN_KEY, { expiresIn: '1h' })
    } catch (err) {
        const error = new HttpError('Something went wrong signing up user', 500)
        return next(error)
    }

    res.status(201).json({ userId: createdUser.id, email: createdUser.email, token, image: createdUser.image })
}

exports.loginUser = async (req, res, next) => {
    const { email, password } = req.body

    let identifiedUser
    try {
        identifiedUser = await User.findOne({ email: email.toLowerCase() })
    } catch (err) {
        const error = new HttpError('Could not log in, please try again', 500)
        return next(error)
    }

    if (!identifiedUser) {
        return next(new HttpError("Could not identify user", 403))
    }

    let isValidPassword = false
    try {
        isValidPassword = await bcrypt.compare(password, identifiedUser.password)
    } catch (error) {
        return next(new HttpError("Could not log you in, please check credentials", 500))
    }

    if (!isValidPassword) {
        const error = new HttpError('Invalid credentials, please try again', 403)
        return next(error)
    }

    let token;
    try {
        token = jwt.sign({ userId: identifiedUser.id, email: identifiedUser.email }, process.env.PRIVATE_TOKEN_KEY, { expiresIn: '1h' })
    } catch (err) {
        const error = new HttpError('Something went wrong logging in', 500)
        return next(error)
    }

    res.status(200).json({ userId: identifiedUser.id, email: identifiedUser.email, token, image: identifiedUser.image })
}