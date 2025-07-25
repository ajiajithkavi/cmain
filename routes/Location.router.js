const express = require('express');
const ip = require('indian_places');
const router = express.Router();

const states = ip.getStates();
let stateMap = {};
let districtMap = {};
let placeMap = {};

let stateId = 1;
let districtId = 1;
let placeId = 1;

// Build ID maps
states.forEach(state => {
  const sid = stateId++;
  stateMap[sid] = { id: sid, name: state.name, ref: state };

  state.getDistricts().forEach(district => {
    const did = districtId++;
    districtMap[did] = { id: did, name: district.name, stateId: sid, ref: district };

    district.getPlaces().forEach(place => {
      const pid = placeId++;
      placeMap[pid] = { id: pid, name: place, districtId: did };
    });
  });
});

// GET all states
router.get('/', (req, res) => {
  const result = Object.values(stateMap).map(({ id, name }) => ({ id, name }));
  res.json(result);
});

// GET districts by state ID
router.get('/:id', (req, res) => {
  const sid = parseInt(req.params.id);
  const districts = Object.values(districtMap).filter(d => d.stateId === sid);
  if (!districts.length) return res.status(404).json({ error: 'No districts found for this state' });

  res.json(districts.map(({ id, name }) => ({ id, name })));
});

// GET places by district ID
router.get('/places/:id', (req, res) => {
  const did = parseInt(req.params.id);
  const places = Object.values(placeMap).filter(p => p.districtId === did);
  if (!places.length) return res.status(404).json({ error: 'No places found for this district' });

  res.json(places.map(({ id, name }) => ({ id, name })));
});



// GET place by ID
router.get('/place/id/:id', (req, res) => {
  const place = placeMap[req.params.id];
  if (!place) return res.status(404).json({ error: 'Place not found' });
  res.json({ id: place.id, name: place.name });
});

module.exports = router;
