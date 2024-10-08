require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const PORT = process.env.PORT || 5000;
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  CommandSucceededEvent,
} = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

// midleweres =>
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

app.use(express.json());
// stripe's midlewere =>
app.use(express.static("public"));

//-------------------------------------

const logger = async (req, res, next) => {
  const url = req.protocol + "://" + req.get("host") + req.originalUrl;
  console.log(`Request Method: ${req.method} | URL: ${url}`);
  next();
};

app.get("/", (req, res) => {
  res.send("Root Access");
});

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
    const paymentCollections = client.db("tasty-trails").collection("payments");
    // jwt reletaded api =>
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // -----------------------
    // -------------------------------midleweres-------------------------------
    const verifyToken = async (req, res, next) => {
      const tokenWithBearer = req.headers?.authorization;
      const token = tokenWithBearer?.split(" ")[1];

      if (!token)
        return res
          .status(401)
          .send({ message: "Access denied. No token provided." });

      jwt.verify(token, process.env.TOKEN_SECRET, (err, decode) => {
        if (err) {
          return res.status(403).send({ message: "forbidden access" });
        }
        if (decode) {
          req.user = decode;
          next();
        }
      });
    };
    const verifyAdmin = async (req, res, next) => {
      const email = req.user.email;
      const query = { email: email };
      const user = await usersCollections.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).json({
          error: "Forbidden. You do not have access to this resource.",
        });
      } else {
        next();
      }
    };

    // --------------------------------------------------------------
    // getting all users dataw =>
    app.get("/users", logger, verifyToken, verifyAdmin, async (req, res) => {
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

    // users status update
    app.patch(
      "/users/role/:id",
      logger,
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const userId = req.params.id;
        const filter = { _id: new ObjectId(userId) };
        const updatedDoc = {
          $set: {
            ...req.body,
          },
        };
        const result = await usersCollections.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );
    // checking user role => ------------------------
    app.get("/users/role/:email", logger, verifyToken, async (req, res) => {
      const email = req.params?.email;
      const query = { email: email };

      if (req.user.email === email) {
        const user = await usersCollections.findOne(query);
        const isAdmin = user.role === "admin";
        res.send(isAdmin);
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    });

    // deleting users  =>
    app.delete(
      "/users/:id",
      logger,
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const userId = req.params.id;
        const query = { _id: new ObjectId(userId) };
        const result = await usersCollections.deleteOne(query);
        res.send(result);
      }
    );
    // adding menus data =>
    app.post(
      "/menus/add",
      logger,
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const data = req.body;
        const result = await menuCollections.insertOne(data);
        res.send(result);
      }
    );
    // getting all menus data
    app.get("/menus", async (req, res) => {
      const result = await menuCollections.find({}).toArray();
      res.send(result);
    });
    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await menuCollections.findOne(query);
      console.log("the result is", result);
      res.send(result);
    });
    //  updating menu items =>
    app.patch("/menu/update/:id", logger, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          ...req.body,
        },
      };
      const result = await menuCollections.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // removing menus items =>
    app.delete("/menus/remove/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollections.deleteOne(query);
      res.send(result);
    });

    // carts collectiosn =>
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

    // payment intent =>
    app.post("/create-payment-intent", logger, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, "the amount");

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        description: "Test payment",
        payment_method_types: ["card"],
      });

      console.log(paymentIntent.client_secret, "the fucking secret");

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.post("/payment", logger, async (req, res) => {
      console.log("payment route hitting");
      const data = req.body;
      const result = await paymentCollections.insertOne(data);
      const query = {
        _id: {
          $in: data.cartIds.map((id) => new ObjectId(id)),
        },
      };
      const removeOperaions = await cartCollections.deleteMany(query);

      res.send({
        paymentRes: result,
        removedCartItems: removeOperaions,
      });
    });

    app.get(
      "/payment-history/:email",
      logger,
      verifyToken,
      async (req, res) => {
        if (req.params.email !== req.user.email) {
          return res.status(403).send({ message: "forbidden access" });
        }

        const query = { email: req.params.email };
        const result = await paymentCollections.find(query).toArray();
        res.send(result);
      }
    );

    // stats  or analystics
    app.get(
      "/admin-stats",
      logger,
      verifyToken,
      verifyAdmin,

      async (req, res) => {
        const users = await usersCollections.estimatedDocumentCount();
        const menus = await menuCollections.estimatedDocumentCount();
        const orders = await paymentCollections.estimatedDocumentCount();

        const result = await paymentCollections
          .aggregate([
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$price" },
              },
            },
          ])
          .toArray();

        const reveniue = result.length > 0 ? result[0].totalRevenue : 0;

        // for conting reveniue this is not the best way  this is a way just
        res.send({
          users,
          menus,
          orders,
          reveniue,
        });
      }
    );

    // order  stats:
    app.get("/order-stats", verifyToken, verifyAdmin, async (req, res) => {
      const paymentResults = await paymentCollections
        .aggregate([
          {
            $unwind: "$menuIds",
          },
          {
            $lookup: {
              from: "menu-collections",
              localField: "menuIds",
              foreignField: "_id",
              as: "menuDetails",
            },
          },
          {
            $unwind: "$menuDetails",
          },
          {
            $group: {
              _id: "$menuDetails.category",
              quentity: {
                $sum: 1,
              },
              reveniues: {
                $sum: "$menuDetails.price",
              },
            },
          },
          {
            $project: {
              _id: 0,
              category: "$_id",
              quentity: 1,
              revenue: "$reveniues", // Make sure the field "reveniues" exists, or correct its spelling if it's "revenues".
            },
          },
        ])
        .toArray();

      res.send(paymentResults);
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
