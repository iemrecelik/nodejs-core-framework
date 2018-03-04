const Users = require(__defined.moduleUrl + 'Document/Users.js');

class UsersController extends Controller{

	index(req, res){

		let validInfo = req.flash('validInfo')[0];
		
		res.render('Users/index', {
			validInfo: validInfo,
			csrfToken: req.csrfToken(),
		});
	}

	async createUser(req, res){
		
		let post = req.body;
		let validSchema = this.getValidSchema('users');

		const ValidatorCtrl = this.getClass('ValidatorCtrl')
		let validInfo = ValidatorCtrl.valid(validSchema, post);
		
		if(validInfo.errorSt === false){

			try{
				let password = this.crypto(validInfo.val.password);		
				delete validInfo.val.password;
				delete validInfo.rawVal.password;

				await Users.create(validInfo.val);

				validInfo.succeed = 'Kullanıcı başarıyla kaydedildi.';

			}catch(err){
				console.log(err)
			}
			
			
			
		}//end if

		req.flash('validInfo', validInfo);
		res.redirect('/user');
	}

	async updateSettings(req, res){
		
		let post = req.body;
		let validSchema = this.getValidSchema('users');

		const ValidatorCtrl = this.getClass('ValidatorCtrl')
		let validInfo = ValidatorCtrl.valid(validSchema, post);
		
		if(validInfo.errorSt === false){
			
			let password = this.crypto(validInfo.val.password);		
			delete validInfo.val.password;
			delete validInfo.rawVal.password;

			await UsersInfo.findOne({ user_id: req.session.user._id, password: password}, (err, data) => {
				
				if(data){
					UsersInfo.updateOne(
						{ user_id: req.session.user._id },
						{ $set: validInfo.val },
						(err, data) => {}
					)
					
					validInfo.succeed = 'Ayarlarınız başarıyla düzenlenmiştir.';		
				}else{
					validInfo.errorSt = true
					validInfo.error.password = `Lütfen şifrenizi doğru giriniz.`;
				}
			})
			
		}//end if

		req.flash('validInfo', validInfo);
		req.flash('navTabAct', 'settings')
		res.redirect('/profile');
	}

	async updateProfileImg(req, res){

		let error, success;
		let file = req.file;

		let regex = /png|jpeg|jpg/;
		
		if(!file)
			error = 'Please choose a file';
		else if(!regex.test(file.mimetype))
			error = 'Entered wrong the file format. Exist formats : png, jpeg, jpg';
		else if(file.size > 1000000)
			error = 'You cant upload a file larger than 1MB';
		else{

			const ImageFilter = this.getClass('ImageFilter')

			let filtImgInfoLProm = await ImageFilter.uploadFilter({
				file: file.buffer, filt: 'profileL', imgExt: file.mimetype.match(/[^\/]+$/)[0]
			});

			let avatar = filtImgInfoLProm.imgName.match(/\/public\/.+/)[0];

			Users.updateOne({_id: req.session.user._id}, {$set: {avatar: avatar}}).exec();

			ImageFilter.deleteImg(req.session.user.avatar);
			req.session.user.avatar = avatar;

			success = 'Successed upload the file';
		}

		req.flash('validInfo', {errorUpload: error, successUpload: success});
		res.redirect('/profile');
	}
}

module.exports = new UsersController();