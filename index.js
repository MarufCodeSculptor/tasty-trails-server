const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const PORT = process.env.PORT || 5000;
require("dotenv").config();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());

const logger = async (req, res, next) => {
  // show full url in a ariable
  const url = req.protocol + "://" + req.get("host") + req.originalUrl;
  console.log(`hitted to =>> ${url}`);
  next();
};

app.get("/", (req, res) => {
  res.send("Root Access");
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
      .db("tasty-trails")
      .collection("menu-collections");
    // getting all menus Data
    const cartCollections = client
      .db("tasty-trails")
      .collection("cart-collections");
    const usersCollections = client.db("tasty-trails").collection("users");
    // getting users  all users  data = >
    app.get("/users", logger, async(req, res) => {
      const usertoken = req.headers;
      console.log(usertoken,'authorizations');
      const result = await usersCollections.find({}).toArray();
      res.send(result);
    });
    //  postng users data =>
    app.post("/users", logger, async (req, res) => {
      const data = req.body;
      // insert email if user doesn't exist aleady
      const user = await usersCollections.findOne({ email: req.body.email });
      if (user) {
        console.log("user availabe not posted ");
        return res.send("User already exists");
      } else {
        const result = await usersCollections.insertOne(data);
        res.send(result);
      }
    });

    // making token  after user login=>
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });

    // users status update
    app.patch("/users/role/:id", logger, async (req, res) => {
      const userId = req.params.id;
      const filter = { _id: new ObjectId(userId) };
      const updatedDoc = {
        $set: {
          ...req.body,
        },
      };
      const result = await usersCollections.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // deleting users  =>
    app.delete("/users/:id", async (req, res) => {
      const userId = req.params.id;
      const query = { _id: new ObjectId(userId) };
      const result = await usersCollections.deleteOne(query);
      res.send(result);
    });
    // getting all menus data
    app.get("/menus", async (req, res) => {
      const result = await menuCollections.find({}).toArray();
      res.send(result);
    });

    // carst collectiosn =>
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.userEmail = email;
      }
      const results = await cartCollections.find(query).toArray();
      res.send(results);
    });
    app.post("/carts", async (req, res) => {
      const data = req.body;
      const result = await cartCollections.insertOne(data);
      res.send(result);
    });
    app.delete("/carts/:id", async (req, res) => {
      const itemId = req.params.id;
      const query = { _id: new ObjectId(itemId) };
      const result = await cartCollections.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(PORT, () => {
  console.log(`server running at PORT: ${PORT}`);
});
