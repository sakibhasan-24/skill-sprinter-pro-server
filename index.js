const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  const assignmentCollections = client
    .db("assignmentList")
    .collection("assignment");
  try {
    client.connect();
    app.post("/create/assignment", async (req, res) => {
      try {
        const assignment = req.body;
        const result = await assignmentCollections.insertOne(assignment);
        // console.log(result);
        res.send({ assignment, result });
      } catch (error) {
        res.send(error);
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
app.get("/", (req, res) => res.send("Hello World!"));
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
run().catch(console.dir);
