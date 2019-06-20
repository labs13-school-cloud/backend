//Dependencies
const router = require("express").Router();
const arrayFlat = require("../helpers/arrayFlat");

//Models
const TrainingSeries = require("../models/db/trainingSeries");
const Messages = require("../models/db/messages");
const Notifications = require("../models/db/notifications");
const TrainingSeriesVolunteers = require("../models/db/training_series_volunteers");
const Users = require("../models/db/users");

// Data validation
const { trainingSeriesSchema } = require("../models/schemas");
const validation = require("../middleware/dataValidation");

router
  .route("/")
  .get(async (req, res) => {
    /**
     * Get all training series associated with an authenticated user.
     * @function
     * @param {Object} req - The Express request object
     * @param {Object} res - The Express response object
     * @returns {Object} - The Express response object
     */
	// Get all of the training series in the database
    const trainingSeries = await TrainingSeries.getAll();

	// Collect an array of promises 
    const volunteerPromises = trainingSeries.map(async series => {
      const volunteers = await TrainingSeriesVolunteers.find({
        "tsv.training_series_id": series.id
	  });
	  return {
		  ...series,
		  volunteers
	  }
    });

	// Resolve all promises and return training series and the volunteers in it
	Promise.all(volunteerPromises).then(results => res.status(200).json({ trainingSeries: results }))
  })
  .post(validation(trainingSeriesSchema), async (req, res) => {
    /**
     * Validate the request body against our training series schema and then Create
     * a new training series
     *
     * @function
     * @param {Object} req - The Express request object
     * @param {Object} req.body - The request body, which represents a new Team Member
     * @param {Object} res - The Express response object
     * @returns {Object} - The Express response object
     */

    //deconstructure the title and user id from the req body.
    const { title, user_id } = req.body;

    //add the new training series to the database
    const newTrainingSeries = await TrainingSeries.add({ title, user_id });

    //return the newly created training series to the client.
    return res.status(201).json({ newTrainingSeries });
  });

router
  .route("/:id")
  .get(async (req, res) => {
    /**
     * get a specific training series by it's ID
     *
     * @function
     * @param {Object} req - The Express request object
     * @param {Object} res - The Express response object
     * @returns {Object} - The Express response object
     */

    // Destructure the ID off of the request parameters
    const { id } = req.params;

    // find the training series in the database based off it's ID
    const trainingSeries = await TrainingSeries.find({ "ts.id": id }).first();

    //if the sought after training series isn't found, return a 404 and message.
    if (!trainingSeries) {
      return res.status(404).json({
        message: "sorry, we couldnt find that training series!"
      });
    }

    //Return the training series to the client
    return res.status(200).json({ trainingSeries });
  })
  .put(validation(trainingSeriesSchema), async (req, res) => {
    /**
     * Validate the request body against the training series schema, then update
     * the specified training series in the database
     *
     * @function
     * @param {Object} req - The Express request object
     * @param {Object} req.body - The request body, which represents the changes we need to make to a specific training series
     * @param {Object} res - The Express response object
     * @returns {Object} - The Express response object
     */

    // Destructure the ID off the request parameters
    const { id } = req.params;

    //update the specific training series in the database
    const updatedTrainingSeries = await TrainingSeries.update(
      { "ts.id": id },
      req.body
    );

    //if the updated training series is not found, return a 404 and message.
    if (!updatedTrainingSeries) {
      return res.status(404).json({
        message: "Sorry! We couldnt find that training series!"
      });
    }
    //return the updated training series to the client
    return res.status(200).json({ updatedTrainingSeries });
  })
  .delete(async (req, res) => {
    /**
     * delete a specific training series
     *
     * @function
     * @param {Object} req - The Express request object
     * @param {Object} res - The Express response object
     * @returns {Object} - The Express response object
     */

    // Destructure the ID off of the request object
    const { id } = req.params;

    // Attempt to delete the specified Team Member from the database
    const deleted = await TrainingSeries.remove({ id });

    // If deleted is falsey, we can assume that there is no Team Member at that ID
    if (!deleted) {
      return res.status(404).json({
        error: "The resource could not be found."
      });
    }

    // Respond to the client with a success message
    return res.status(200).json({
      message: "The resource has been deleted."
    });
  });

router.get("/:id/messages", async (req, res) => {
  /**
   * get the messages for a specific training series
   * @function
   * @param {Object} req - The Express request object
   * @param {Object} res - The Express response object
   * @returns {Object} - The Express response object
   *
   */

  // Destructure the ID off of the request object
  const { id } = req.params;

  //find the specific training series in the database by it's ID.
  const trainingSeries = await TrainingSeries.find({ "ts.id": id });

  //if no training series is found with that ID return a 404 and message.
  if (!trainingSeries.length) {
    return res.status(404).json({
      message: "Sorry! That training series doesn't exist."
    });
  }

  //find the messages by ID
  const messages = await Messages.find({ "ts.id": id });

  //return the training series and its messages to the client
  return res.status(200).json({ trainingSeries, messages });
});

router.get("/:id/volunteers", async (req, res) => {
  /**
   * get the volunteers doing a specific training series
   *
   * @function
   * @param {Object} req - The Express request object
   * @param {Object} res - The Express response object
   * @returns {Object} - The Express response object
   */

  const { id } = req.params; // Destructure the ID from the req.params

  const trainingSeries = await TrainingSeries.find({ "ts.id": id }); // Store the training series in a variable

  if (!trainingSeries.length) {
    return res.status(404).json({
      message: "Sorry! That training series doesn't exist."
    });
  }

  // *console.log(trainingSeries);
  const volunteers = await TrainingSeriesVolunteers.find({
    "tsv.training_series_id": id
  });

  if (!volunteers.length) {
    return res.status(404).json({
      message: "This training series currently has no volunteers assigned"
    });
  }

  res.status(200).json({ trainingSeries, volunteers }); // Return an array of volunteers
});

router.post("/:id/volunteers", async (req, res) => {
  const { user_id: volunteer_id } = req.body;
  const { id: training_series_id } = req.params;

  const relation = await TrainingSeriesVolunteers.find({
    "tsv.volunteer_id": volunteer_id,
    "tsv.training_series_id": training_series_id
  }).first();

  if (relation) {
    return res.status(400).json({
      message: "This volunteer is already a part of this training series"
    });
  }

  const newRelation = await TrainingSeriesVolunteers.add({
    volunteer_id,
    training_series_id
  });

  return res.status(200).json({ newRelation });
});

router.delete("/:id/volunteers/:user_id", async (req, res) => {
  const { id: training_series_id, user_id: volunteer_id } = req.params;

  const volunteer = await TrainingSeriesVolunteers.find({
    "tsv.volunteer_id": volunteer_id,
    "tsv.training_series_id": training_series_id
  }).first();

  if (!volunteer) {
    return res.status(404).json({
      message: "Volunteer can not be found in this training series"
    });
  }

  const deleted = await TrainingSeriesVolunteers.remove({
    "tsv.volunteer_id": volunteer_id,
    "tsv.training_series_id": training_series_id
  });

  return res.status(200).json({
    deleted,
    message: "The volunteer has been removed from the training series."
  });
});

//! Might not need anymore
router.get("/:id/assignees", async (req, res) => {
  /**
   * get the team members for the specific training series
   *
   * @function
   * @param {Object} req - The Express request object
   * @param {Object} res - The Express response object
   * @returns {Object} - The Express response object
   */

  // Destructure the ID off of the request object
  const { id } = req.params;

  // Get all Messages meant for Team Members
  const messages = await Messages.find({
    "ts.id": id,
    "m.for_team_member": true
  });

  // If no Messages are found, return a 404
  if (!messages.length) {
    return res.status(404).json({
      message: "This Training Series has no messages meant for Team Members"
    });
  }

  // Create an array of pending promises for each
  // notification matching a message
  const pAssignees = messages.map(
    async m =>
      await Notifications.find({
        "m.id": m.id
      })
  );

  // Resolve all promises in the pAssignees array
  const rAssignees = await Promise.all(pAssignees);

  // Recursively flatten the array
  const assignedTeamMembers = arrayFlat(rAssignees);

  // Return the assigned Team Members to the client
  return res.status(200).json({ assignedTeamMembers });
});

module.exports = router;
