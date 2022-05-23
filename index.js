const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
const verify = require('jsonwebtoken/verify');
const middlewareWrapper = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;


//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rxy3e.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        const toolsCollection = client.db('tools_manufacturer').collection('tools');

        app.get('/tools', async (req, res) => {
            const query = {};
            
        })
    }
    finally {
        
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Tools manufacturer is running');
})

app.listen(port, () => {
    console.log(`Tools manufacturer is on port ${port}`);
})