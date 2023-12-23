const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cokkieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
app.use(cokkieParser());
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
  const submitAssignment = client
    .db("submitAssignmentList")
    .collection("submitAssignment");
  const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }
    jwt.verify(token, "secret", (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Token is not valid" });
      }

      req.user = decoded;

      next();
    });
  };
  try {
    client.connect();
    // create token
    app.post("/create/token", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, "secret");
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .status(200)
        .json({ token, user });
    });
    app.post("/logout", async (req, res) => {
      const token = req.cookies.token;
      console.log(token);
      res.clearCookie("token");
    });
    // create
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
    //
    app.get("/get/assignment", async (req, res) => {
      const result = await assignmentCollections.find().toArray();
      res.send(result);
    });
    // single assignmentLoad
    app.get("/get/assignment/:id", async (req, res) => {
      const result = await assignmentCollections.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });
    // delete assignment
    app.delete("/delete/assignment/:id", verifyToken, async (req, res) => {
      const deletedAssignment = await assignmentCollections.findOne({
        _id: new ObjectId(req.params.id),
      });
      if (!deletedAssignment) {
        return res.status(404).send({ error: "Assignment not found" });
      }
      if (deletedAssignment.owner !== req.user.email) {
        return res.status(401).send({ error: "Unauthorized" });
      }
      const result = await assignmentCollections.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.status(200).json({
        message: "Assignment deleted successfully",
        success: true,
        result,
      });
    });
    app.patch("/edit/assignment/:id", verifyToken, async (req, res) => {
      const assignmentExist = await assignmentCollections.findOne({
        _id: new ObjectId(req.params.id),
      });
      if (!assignmentExist) {
        return res.status(404).send({ error: "Assignment not found" });
      }
      if (assignmentExist.owner !== req.user.email) {
        return res.status(401).send({ error: "Unauthorized" });
      }
      const options = { upsert: true };
      const question = req.body;
      const updatedDoc = {
        $set: {
          title: question.title,
          date: question.date,
          description: question.description,
          level: question.level,
          image: question.image,
          marks: question.marks,
        },
      };
      const result = await assignmentCollections.updateOne(
        { _id: new ObjectId(req.params.id) },
        updatedDoc,
        options
      );
      console.log(result);
      res.status(200).json({
        message: "Assignment updated successfully",
        success: true,
        result,
        question,
      });
    });
    //   create submit assignment
    app.post("/submit/assignment", verifyToken, async (req, res) => {
      //   console.log(req.params.id);

      const data = req.body;
      console.log(data);
      const existingAssignment = await assignmentCollections.findOne({
        _id: new ObjectId(data.id),
      });
      console.log(existingAssignment.owner, req.user.email);
      if (existingAssignment.owner !== req.user.email) {
        console.log("you can submit ");
        console.log(data);
        const result = await submitAssignment.insertOne(data);
        res.status(201).json({
          message: "Assignment submitted successfully",
          result,
          data,
          success: true,
        });
      } else {
        res.status(200).json("you can not submit your own assignment");
      }
    });
    // get submitted assignment
    app.get("/submitted/assignments", verifyToken, async (req, res) => {
      const query = {};
      const result = await submitAssignment.find(query).toArray();

      res
        .status(200)
        .json({ message: "submitted assignment", result, success: true });
    });
    // get submitted assignment on assignment id
    app.get("/assignment/:id", async (req, res) => {
      const id = req.params.id;
      const result = await assignmentCollections.findOne({
        _id: new ObjectId(id),
      });
      res
        .status(200)
        .json({ message: "assignment details", result, success: true });
    });
    // get pending  submitted assignment
    app.get("/pending/submitted/assignments", async (req, res) => {
      const result = await submitAssignment
        .find({ status: "pending" })
        .toArray();
      res.status(200).json({
        message: "submitted assignment pending",
        result,
        success: true,
      });
    });
    app.patch("/update/assignment/:id", async (req, res) => {
      const id = req.params.id;
      const existingState = await submitAssignment.findOne({
        _id: new ObjectId(id),
      });
      console.log(existingState);
      const data = req.body;
      console.log(data);
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          status: data.status,
          updatedAt: new Date(),
        },
      };
      const result = await submitAssignment.updateOne(
        { _id: new ObjectId(req.params.id) },
        updatedDoc,
        options
      );
      res.send({ message: "assignment updated", result, success: true });
    });
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
app.get("/", (req, res) => res.send("Hello World!"));
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
run().catch(console.dir);
