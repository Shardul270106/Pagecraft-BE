const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const controller = require('../controllers/uploadController');

const router = express.Router();
router.post('/image', requireAuth, controller.uploadImage);

module.exports = router;
