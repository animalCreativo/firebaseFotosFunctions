const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   response.send("Hello from Firebase watos!");
//   console.log('watoss');
//  });


const gcs = require('@google-cloud/storage')({ keyFilename:
	'fotogramashow-firebase-adminsdk-y8ybp-c5ba0fa340.json'});
const spawn = require('child-process-promise').spawn;
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase)

exports.generateThumbnail = functions.storage.object()
	.onChange(event => {
		const object = event.data;
		const filePath = object.name;
		const fileName = filePath.split('/').pop();
		const fileBucket = object.bucket ;
		const bucket = gcs.bucket(fileBucket);
		const tempFilePath = `/tmp/${fileName}`;
		const ref = admin.database().ref();
		const file = bucket.file(filePath);
		const thumbFilePath = filePath.replace(/(\/)?([^\/]*)$/,'$1thumb_$2')

		if (fileName.startsWith('thumb_')){
			console.log('es una thumbnail');
			return ;

		}

		if(!object.contentType.startsWith('image/')){
			console.log('Esta no es una imagen');
			return ;

		}
		if(object.resourceState === 'not_exists' ){
			console.log('Es archivo fue borrado');
			return ;

		}
		return bucket.file(filePath).download({
			destination: tempFilePath
		})
		.then(() => {
			console.log('Imagen descarda a temporal', tempFilePath);
			//return spawn('convert',[tempFilePath,'-thumbnail', '200x200', tempFilePath]);
			return spawn('convert',[tempFilePath,'-thumbnail', '200x200^','\-gravity','center','-extent','200x200',tempFilePath]);

			
		})
		.then(()=> {
			console.log('Thumbnail creada')
			return bucket.upload(tempFilePath,{
				destination: thumbFilePath
			});
		})
		.then(() => {
			const thumbFile = bucket.file(thumbFilePath)
			const config = {
				action: 'read',
				expires: '07-10-2050'
			}
			return Promise.all([
				thumbFile.getSignedUrl(config),
				file.getSignedUrl(config)
			])
			
		})
		.then(results => {
			const thumbResult = results[0];
			const originaResult = results[1];
			const thumbFileUrl = thumbResult[0];
			const fileUrl = originaResult[0];
//			return ref.child('fotos').push({urlImagen: fileUrl , urlImagen_thumb:thumbFileUrl ,nameImagen: fileName })
			return ref.child('fotos').push({
				urlImagen: fileUrl ,
				urlImagen_thumb:thumbFileUrl ,
				nameImagen: fileName , 
				v: "false",
				v_notP: "false",
				v_p_w: "false"
				})

		})

	})