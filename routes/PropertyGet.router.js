const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');

const BuilderProfile = require('../models/Property/BuilderProfile.model');
const Project = require('../models/Property/Project.model');
const Building = require('../models/Property/Building.model');
const Floor = require('../models/Property/Floor.model');
const Unit = require('../models/Property/Unit.model');

// GET all builders with nested projects, buildings, floors, and units
router.get('/', async (req, res) => {
  try {
    const builders = await BuilderProfile.find();

    const builderData = await Promise.all(
      builders.map(async (builder) => {
        const projects = await Project.find({ builder: builder._id });

        const projectData = await Promise.all(
          projects.map(async (project) => {
            const buildings = await Building.find({ project: project._id });

            const buildingData = await Promise.all(
              buildings.map(async (building) => {
                const floors = await Floor.find({ building: building._id });

                const floorData = await Promise.all(
                  floors.map(async (floor) => {
                    const units = await Unit.find({ floor: floor._id });
                    return { ...floor.toObject(), units };
                  })
                );

                return { ...building.toObject(), floors: floorData };
              })
            );

            return { ...project.toObject(), buildings: buildingData };
          })
        );

        return { ...builder.toObject(), projects: projectData };
      })
    );

    res.json(builderData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get full builder details with projects, buildings, floors, and units
router.get('/builder/:builderId', async (req, res) => {
  try {
    const builder = await BuilderProfile.findById(req.params.builderId);
    if (!builder) return res.status(404).json({ message: 'Builder not found' });

    const projects = await Project.find({ builder: builder._id });

    const projectData = await Promise.all(
      projects.map(async (project) => {
        const buildings = await Building.find({ project: project._id });

        const buildingData = await Promise.all(
          buildings.map(async (building) => {
            const floors = await Floor.find({ building: building._id });

            const floorData = await Promise.all(
              floors.map(async (floor) => {
                const units = await Unit.find({ floor: floor._id });
                return { ...floor.toObject(), units };
              })
            );

            return { ...building.toObject(), floors: floorData };
          })
        );

        return { ...project.toObject(), buildings: buildingData };
      })
    );

    res.json({ ...builder.toObject(), projects: projectData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get full project with buildings, floors, and units
router.get('/project/:projectId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const buildings = await Building.find({ project: project._id });

    const buildingData = await Promise.all(
      buildings.map(async (building) => {
        const floors = await Floor.find({ building: building._id });

        const floorData = await Promise.all(
          floors.map(async (floor) => {
            const units = await Unit.find({ floor: floor._id });
            return { ...floor.toObject(), units };
          })
        );

        return { ...building.toObject(), floors: floorData };
      })
    );

    res.json({ ...project.toObject(), buildings: buildingData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get full building with floors and units
router.get('/building/:buildingId', async (req, res) => {
  try {
    const building = await Building.findById(req.params.buildingId);
    if (!building) return res.status(404).json({ message: 'Building not found' });

    const floors = await Floor.find({ building: building._id });

    const floorData = await Promise.all(
      floors.map(async (floor) => {
        const units = await Unit.find({ floor: floor._id });
        return { ...floor.toObject(), units };
      })
    );

    res.json({ ...building.toObject(), floors: floorData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get full floor with units
router.get('/floor/:floorId', async (req, res) => {
  try {
    const floor = await Floor.findById(req.params.floorId);
    if (!floor) return res.status(404).json({ message: 'Floor not found' });

    const units = await Unit.find({ floor: floor._id });

    res.json({ ...floor.toObject(), units });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/landing-filter', async (req, res) => {
  try {
    const { city, area, propertyType, minPrice, maxPrice } = req.query;

    const match = {
      ...(city && { 'location.city': city }),
      ...(area && { 'location.area': area }),
      ...(propertyType && { propertyType }),
      ...(minPrice && maxPrice && {
        price: { $gte: parseInt(minPrice), $lte: parseInt(maxPrice) }
      })
    };

    const projects = await Project.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$builder',
          projects: { $push: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'builderprofiles',
          localField: '_id',
          foreignField: '_id',
          as: 'builderProfile'
        }
      },
      { $unwind: '$builderProfile' },
      {
        $project: {
          _id: 0,
          builder: '$builderProfile',
          projects: 1
        }
      }
    ]);

    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



module.exports = router;