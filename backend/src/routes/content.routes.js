const express = require('express');
const contentController = require('../controllers/content.controller');
const { auth, sellerOnly } = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes here are protected and for sellers only
router.use(auth, sellerOnly);

// Modules
router.get('/:productId/modules', contentController.listModules);
router.post('/:productId/modules', contentController.createModule);
router.put('/modules/:moduleId', contentController.updateModule);
router.delete('/modules/:moduleId', contentController.deleteModule);

// Lessons
router.get('/modules/:moduleId/lessons', contentController.listLessons);
router.post('/modules/:moduleId/lessons', contentController.createLesson);
router.put('/lessons/:lessonId', contentController.updateLesson);
router.delete('/lessons/:lessonId', contentController.deleteLesson);

// Files (attachments per lesson)
router.get('/lessons/:lessonId/files', contentController.listFiles);
router.post('/lessons/:lessonId/files', contentController.addFile);
router.delete('/files/:fileId', contentController.deleteFile);

module.exports = router;
