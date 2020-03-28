const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const Joi = require("@hapi/joi"); // joi validation tool

const { Pool } = require('pg'); // postgres
const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT
});

const app = express();
const port = process.env.PORT || 8080;

app.use(express.static("public"));
app.use(bodyParser.json())
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
)

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + "/index.html"));
});

// GET all tasks
app.get("/api/tasks", (req, res) => {
    pool.query("SELECT * FROM todo", (error, result) => {
        if (error) throw error;

        res.status(200).json(result.rows);
    });
});

// GET a specific task
app.get("/api/tasks/:id", (req, res) => {
    // if the id is not a number, send an error
    const taskId = parseInt(req.params.id);
    if (Number.isNaN(taskId)) return res.status(400).send("The ID must be a number.");

    // check that the task exists
    pool.query(`SELECT EXISTS(SELECT id FROM todo WHERE id = '${taskId}')`, (error, result) => {
        if (error) throw error;

        // if the task does not exist, send an error
        const taskExists = result.rows[0].exists;
        if (!taskExists) return res.status(404).send("The task with the given ID was not found.");

        // retrieve the task from the database
        pool.query(`SELECT * FROM todo WHERE id = '${taskId}'`, (error, result) => {
            if (error) throw error;

            res.status(200).json(result.rows[0]); // send the task
        });
    });
});

// POST a task
app.post("/api/tasks", (req, res) => {
    const result = validatePostTask(req.body);
    const { value } = result;
    const { error } = result;
    // if there was an error with the validation, send an error
    if (error) return res.status(400).send(error.details[0].message);

    // if there is a quote mark in the task name, send an error
    if (value.name.includes('"') || value.name.includes("'")) return res.status(422).send("Quote marks are not allowed.");

    // add the task to the database and retrieve the ID of the newly added task
    pool.query(`INSERT INTO todo (name, completed) VALUES ('${value.name}', '${value.completed}'); SELECT currval('todo_id_seq')`, (error, result) => {
        if (error) throw error;

        // retrieve the newly added task
        const taskId = result[1].rows[0].currval;
        pool.query(`SELECT * FROM todo WHERE id = '${taskId}'`, (error, result) => {
            if (error) throw error;

            res.status(201).json(result.rows[0]); // as a best practice, send the posted task as a response
        });
    });
});

// PUT a specific task
app.put("/api/tasks/:id", (req, res) => {
    // if the id is not a number, send an error
    const taskId = parseInt(req.params.id);
    if (Number.isNaN(taskId)) return res.status(400).send("The ID must be a number.");

    // check that the task exists
    pool.query(`SELECT EXISTS(SELECT id FROM todo WHERE id = '${taskId}')`, (queryError, result) => {
        if (queryError) throw queryError;

        // if the task does not exist, send an error
        const taskExists = result.rows[0].exists;
        if (!taskExists) return res.status(404).send("The task with the given ID was not found.");

        // task exists; get it so that we can validate against it and send it as a response
        pool.query(`SELECT * FROM todo WHERE id = '${taskId}'`, (queryError, result) => {
            if (queryError) throw queryError;

            let task = result.rows[0];
            const validationResult = validatePutTask(task, req.body);
            const { value } = validationResult;
            const { error } = validationResult;
            // if there was an error with the validation, send an error
            if (error) return res.status(400).send(error.details[0].message);

            // update the task in the database
            pool.query(`UPDATE todo SET completed = ${value.completed} WHERE id = '${taskId}'`, (queryError, result) => {
                if (queryError) throw queryError;

                task.completed = value.completed;
                res.status(200).send(task); // as a best practice, send the updated task as a response
            });
        });
    });
});

app.delete("/api/tasks/:id", (req, res) => {
    // if the id is not a number, send an error
    const taskId = parseInt(req.params.id);
    if (Number.isNaN(taskId)) return res.status(400).send("The ID must be a number.");

    // check that the task exists
    pool.query(`SELECT EXISTS(SELECT id FROM todo WHERE id = '${taskId}')`, (error, result) => {
        if (error) throw error;

        // if the task does not exist, send an error
        const taskExists = result.rows[0].exists;
        if (!taskExists) return res.status(404).send("The task with the given ID was not found.");

        // task exists; get it so that we can send it as a response
        pool.query(`SELECT * FROM todo WHERE id = '${taskId}'`, (queryError, result) => {
            if (queryError) throw queryError;

            const task = result.rows[0];
            // delete the task from the database
            pool.query(`DELETE FROM todo WHERE id = '${taskId}'`, (error, result) => {
                if (error) throw error;

                res.status(200).json(task); // as a best practice, send the deleted task as a response
            });
        });
    });
});

app.listen(port, () => {
    console.log(`NWEN304 Project app listening on port ${port}...`);
});

/**
 * Validates the POST request body using the POST request body schema.
 * @param {object} task 
 * @return {ValidationResult<any>} The joi validation result.
 */
function validatePostTask(task) {
    const schema = {
        name: Joi.string().min(1).required(),
        completed: Joi.boolean().empty(null).default(false)
    };

    return Joi.validate(task, schema);
}

/**
 * Validates the PUT request body using the PUT request body schema.
 * @param {object} oldTask 
 * @param {object} newTask 
 * @return {ValidationResult<any>} The joi validation result.
 */
function validatePutTask(oldTask, newTask) {
    const schema = {
        completed: Joi.boolean().default(oldTask.completed)
    };

    return Joi.validate(newTask, schema);
}