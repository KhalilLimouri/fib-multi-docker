const keys = require('./keys')

//Express app
const express = require('express')
const bodyParser = require('body-parser')
const core = require('cors')

const app = express()
app.use(cors())
app.use(bodyParser.json())

//Pg client
const { Pool } = require('pg')
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
})

//err listener
pgClient.on('err', () => console.error('Lost PG conn'))

pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch(err => console.log(err))

//Redis client 

const redis = require('redis')
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
})
const redisPublisher = redisClient.duplicate()

app.get('/', (req, res) => { res.send("req") })

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * from values')
    req.send(values.rows)
})

app.get('/values/all', async (req, res) => {
    redisClient.hgetall('vaules', (err, values) => {
        res.send(values)
    })
})

app.post('/values', async (req, res) => {
    const index = req.body.index
    if (parseInt(index) > 40) {
        return res.status(422).send('Invalid index')
    }
    redisClient.hset('values', index, 'none')
    redisPublisher.publish('insert', index)
    pgClient.query('INSERT INTO values(number) VALUES (&1), [index]')

    res.send({ working: true })
})

app.listen(5000, err => {
    console.log('listening')
})