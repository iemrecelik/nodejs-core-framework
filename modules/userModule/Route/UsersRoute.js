const express = require('express')
	, router = express.Router()
	, csurf = require('csurf')
	, multer = require('multer')
	, usersCtrl = require(__defined.moduleUrl + 'Controller/UsersController.js');

const csrfProtection = csurf({ cookie: true });
const upload = multer({
	fileFilter: fileFilter,
	// limits: { fileSize: 3000000 }
}); // for parsing multipart/form-data

let index = (req, res) => {usersCtrl.index(req, res)}
	, updateProfileImg = (req, res) => {usersCtrl.updateProfileImg(req, res)}
	, createUser       = (req, res) => {usersCtrl.createUser(req, res)}
	, createUserPost   = (req, res) => {usersCtrl.createUserPost(req, res)}
	, updateUser       = (req, res) => {usersCtrl.updateUser(req, res)}
	, updateUserPost   = (req, res) => {usersCtrl.updateUserPost(req, res)}

let processes = {
	'index'           : [csrfProtection, index],
	'createUser'      : [csrfProtection, createUser],
	'createUserPost'  : [csrfProtection, createUserPost],
	'updateUser'      : [csrfProtection, updateUser],
	'updateUserPost'  : [csrfProtection, updateUserPost],
	'updateProfileImg': [upload.single('uploadFile'), csrfProtection, updateProfileImg]
}

router.route('/')
	.get(processes.index);

router.route('/create')
	.get(processes.createUser)
	.post(processes.createUserPost);

// router.route(/.+\/update\/?$/)
router.route('/:id/update')
	.get(processes.updateUser)
	.post(processes.updateUserPost);

router.post('/:id/profile-img-up', processes.updateProfileImg);

router.all('/', __defined.errorHandle);

function fileFilter(req, file, cb){
	let regex = /png|jpeg|jpg/;
	
	if(regex.test(file.mimetype))
		cb(null, true)
	else
		cb(null, false)	
	
	// cb(new Error('entered wrong file type'))
}

module.exports = router;