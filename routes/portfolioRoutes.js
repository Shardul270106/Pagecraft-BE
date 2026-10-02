const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const controller = require('../controllers/portfolioController');

const router = express.Router();
router.get('/public/:slug', controller.publicPage);
router.use(requireAuth);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.get);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/duplicate', controller.duplicate);
router.post('/:id/publish', controller.publish);
module.exports = router;
