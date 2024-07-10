const express = require('express');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 5000;
require('dotenv').config();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Root Access');
});

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.6mzg5rv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const menuCollections = client
      .db('tasty-trails')
      .collection('menu-collections');
      // getting all menus Data
    app.get('/menus', async (req, res) => {
      const result = await menuCollections.find({}).toArray();
      res.send(result);
    });

    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`server running at PORT: ${PORT}`);
});
