
const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');

const BuilderProfile = require('../models/Property/BuilderProfile.model');
const Project = require('../models/Property/Project.model');
const Building = require('../models/Property/Building.model');
const Floor = require('../models/Property/Floor.model');
const Unit = require('../models/Property/Unit.model');

// --- Builder Profile ---
router.post('/builder-profile', authenticate, authorizeRoles('directBuilder', 'admin', 'superAdmin'), async (req, res) => {
  try {
    const { user } = req.body;
    
    // const existingUser = await User.findById(user);
    // if (!existingUser) {
    //   return res.status(404).json({ message: 'User not found' });
    // }
    // Check if builder profile already exists
    const existingProfile = await BuilderProfile.findOne({ user });
    if (existingProfile) {
      return res.status(200).json({
        message: 'Builder profile already exists for this user.',
        builderProfile: existingProfile
      });
    }
    const profile = new BuilderProfile(req.body);
    await profile.save();
    res.status(201).json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/builder-profile', async (req, res) => {
  try {
    const profiles = await BuilderProfile.find();
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch builder profiles' });
  }
});

router.get('/builder-profile/:id', async (req, res) => {
  try {
    const profile = await BuilderProfile.findById(req.params.id);
    res.json(profile);
  } catch (err) {
    res.status(404).json({ error: 'Builder profile not found' });
  }
});

router.get('/builder-profile/user/:userId', async (req, res) => {
  try {
    const profile = await BuilderProfile.findOne({ user: req.params.userId });
    
    if (!profile) {
      return res.status(404).json({ error: 'Builder profile not found for this user' });
    }
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/builder-profile/:id/full-details', async (req, res) => {
  try {
    const builderId = req.params.id; 
    const projects = await Project.find({ builder: builderId });

    const detailedProjects = await Promise.all(
      projects.map(async (project) => {
        const buildings = await Building.find({ project: project._id });

        const detailedBuildings = await Promise.all(
          buildings.map(async (building) => {
            const floors = await Floor.find({ building: building._id });

            const detailedFloors = await Promise.all(
              floors.map(async (floor) => {
                const units = await Unit.find({ floor: floor._id });
                return {
                  ...floor.toObject(),
                  units,
                };
              })
            );

            return {
              ...building.toObject(),
              floors: detailedFloors,
            };
          })
        );

        return {
          ...project.toObject(),
          buildings: detailedBuildings,
        };
      })
    );
    res.json({
      builderProfileId: builderId,
      projects: detailedProjects,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch builder project hierarchy' });
  }
});

router.put('/builder-profile/:id', authenticate, authorizeRoles('directBuilder', 'admin', 'superAdmin'), async (req, res) => {
  try {
    const profile = await BuilderProfile.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(profile);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/builder-profile/:id', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    await BuilderProfile.findByIdAndDelete(req.params.id);
    res.json({ message: 'Builder profile deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Project ---
router.post('/project', authenticate, authorizeRoles('directBuilder', 'admin', 'superAdmin'), async (req, res) => {
  try {
    const { builder, projectName } = req.body;

    const builderExists = await BuilderProfile.findById(builder);
    if (!builderExists) {
      return res.status(404).json({ message: 'Builder not found.' });
    }

    //Check for duplicate project name under the same builder
    const existingProject = await Project.findOne({ builder, projectName });
    if (existingProject) {
      return res.status(409).json({ message: `Project "${projectName}" already exists for this builder.` });
    }

    const project = new Project(req.body);
    await project.save();
    res.status(201).json(project);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/project', async (req, res) => {
  try {
    const projects = await Project.find().populate('builder', 'companyName');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});


router.get('/projects/by-builder/:builderId', async (req, res) => {
  try {
    const projects = await Project.find({ builder: req.params.builderId });
    res.json(projects);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/project/:id', authenticate, authorizeRoles('directBuilder', 'admin', 'superAdmin'), async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/project/:id', authenticate, authorizeRoles('admin', 'superAdmin','directBuilder'), async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Building ---
// router.post('/building', authenticate, authorizeRoles('directBuilder', 'admin', 'superAdmin'), async (req, res) => {
router.post('/building', async (req, res) => {
  
  try {
    const { project, buildingName } = req.body;

    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return res.status(404).json({ message: 'Project not found. Please provide a valid project ID.' });
    }

    const duplicateBuilding = await Building.findOne({ project, buildingName });
    if (duplicateBuilding) {
      return res.status(409).json({ message: `Building "${buildingName}" already exists in this project.` });
    }

    const building = new Building(req.body);
    await building.save();
    res.status(201).json(building);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


router.get('/buildings', async (req, res) => {
  try {
    const buildings = await Building.find().populate('project', 'projectName'); // Optional: populate project info
    res.json(buildings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


router.get('/buildings/by-project/:projectId', async (req, res) => {
  try {
    const buildings = await Building.find({ project: req.params.projectId })
    .populate('project', 'projectName location propertyType');
    res.json(buildings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// router.put('/building/:id', authenticate, authorizeRoles('directBuilder', 'admin', 'superAdmin'), async (req, res) => {
router.put('/building/:id',  async (req, res) => {
  try {
    const building = await Building.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(building);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/building/:id', authenticate, authorizeRoles('admin', 'superAdmin','directBuilder'), async (req, res) => {
  try {
    await Building.findByIdAndDelete(req.params.id);
    res.json({ message: 'Building deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Floor ---
router.post('/floor', authenticate, authorizeRoles('directBuilder', 'admin', 'superAdmin'), async (req, res) => {
  try {
    const { building, floorNumber } = req.body;

    const buildingExists = await Building.findById(building);
    if (!buildingExists) {
      return res.status(404).json({ message: 'Building not found. Please provide a valid building ID.' });
    }

    const existingFloor = await Floor.findOne({ building, floorNumber });
    if (existingFloor) {
      return res.status(409).json({ message: `Floor ${floorNumber} already exists in this building.` });
    }

    const floor = new Floor(req.body);
    await floor.save();
    res.status(201).json(floor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


router.get('/floors', async (req, res) => {
  try {
    const floors = await Floor.find().populate('building', 'buildingName');
    res.json(floors);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


router.get('/floors/by-building/:buildingId', async (req, res) => {
  try {
    const floors = await Floor.find({ building: req.params.buildingId });
    res.json(floors);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/floor/:id', authenticate, authorizeRoles('directBuilder', 'admin', 'superAdmin'), async (req, res) => {
  try {
    const floor = await Floor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(floor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/floor/:id', authenticate, authorizeRoles('admin', 'superAdmin','directBuilder'), async (req, res) => {
  try {
    await Floor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Floor deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Unit ---
router.post('/unit', authenticate, authorizeRoles('directBuilder', 'admin', 'superAdmin'), async (req, res) => {
  try {
    const { floor, unitNumber } = req.body;

    const floorExists = await Floor.findById(floor);
    if (!floorExists) {
      return res.status(404).json({ message: 'Floor not found. Please provide a valid floor ID.' });
    }

    const duplicate = await Unit.findOne({ floor, unitNumber });
    if (duplicate) {
      return res.status(409).json({ message: `Unit ${unitNumber} already exists on this floor.` });
    }

    const unit = new Unit(req.body);
    await unit.save();
    res.status(201).json(unit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/units', async (req, res) => {
  try {
    const units = await Unit.find()
      .populate({
        path: 'floor',
        populate: {
          path: 'building',
          populate: 'project'
        }
      }); 
    res.json(units);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/unit/:id', async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id)
      .populate({
        path: 'floor',
        populate: {
          path: 'building',
          populate: 'project'
        }
      });

    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    res.json(unit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


router.get('/units/by-floor/:floorId', async (req, res) => {
  try {
    const units = await Unit.find({ floor: req.params.floorId });
    res.json(units);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/unit/:id', authenticate, authorizeRoles('directBuilder', 'admin', 'superAdmin'), async (req, res) => {
  try {
    const unit = await Unit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(unit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/unit/:id', authenticate, authorizeRoles('admin', 'superAdmin','directBuilder'), async (req, res) => {
  try {
    await Unit.findByIdAndDelete(req.params.id);
    res.json({ message: 'Unit deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
