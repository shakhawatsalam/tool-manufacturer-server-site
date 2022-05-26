const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const verify = require('jsonwebtoken/verify');
const middlewareWrapper = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


//middleware
app.use(cors());
app.use(express.json());



//verifyJWT
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ massage: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log(err)
            return res.status(403).send({ massage: 'Forbidden access!!!', error: true });
        }
        req.decoded = decoded;
        next();
    })



}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rxy3e.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        const toolsCollection = client.db('tools_manufacturer').collection('tools');
        const usersCollection = client.db('tools_manufacturer').collection('users');
        const orderCollection = client.db('tools_manufacturer').collection('order');
        const paymentsCollection = client.db('tools_manufacturer').collection('payments');
        const reviewCollection = client.db('tools_manufacturer').collection('reviews');


        // All Tools Api
        app.get('/tools', async (req, res) => {
            const query = {};
            const cursor = toolsCollection.find(query);
            const tools = await cursor.toArray();
            res.send(tools);
        });
        // delete api for tools form home page
        app.delete('/tools/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await toolsCollection.deleteOne(query);
            res.send(result);

        });
        // Tools post api for adding product
        app.post('/tools', async (req, res) => {
            const tools = req.body;
            const result = await toolsCollection.insertOne(tools);
            res.send({ success: true, result });
        });
        //stripe Api
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const product = req.body;
            const price = product.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        // individual call tools api
        app.get('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const tool = await toolsCollection.findOne(query);
            res.send(tool);
        });
        //get all user for making admin
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);
        });
        //Req Admin
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });

        })
        //api for adding admin field to usercolloction 
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {

                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.send(result);
            } else {
                res.status(403).send({ message: 'forbidden' });
            }
        });
        //usetoken put and set jwt for user
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
            res.send({ result, token });
        });


        //add order to database
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send({ success: true, result });
        });

        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentsCollection.insertOne(payment);
            const updateOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc)

        })
        // My Order Api
        app.get('/order', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const cursor = orderCollection.find(query);
                const order = await cursor.toArray();
                res.send(order);
            }
            else {
                res.status(403).send({ message: 'frobidden access' });
            }
        });
        // Get Order for Payment
        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await orderCollection.findOne(query);
            res.send(order);
        })
        //deleting My order
        app.delete('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);

        });

        // add reviews to database post api
        app.post('/reviews', async (req, res) => {
            const reviews = req.body;
            console.log(reviews);
            const result = await reviewCollection.insertOne(reviews);
            res.send({ success: true, result });
        });
        // get api for reviews 
        app.get('/reviews', verifyJWT, async (req, res) => {
            const reviews = await reviewCollection.find().toArray();
            res.send(reviews);
        });



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