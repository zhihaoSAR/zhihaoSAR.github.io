/*
** Seminario #4: Otros_efectos
** Picking, video y multivista
** @author: rvivo@upv.es
** @date: 3-03-2021
** @dependencies: OrbitControls.js, Tween.js, dat.gui.min.js
*/

"use strict";

// Variables globales estandar
var renderer, scene, camera;

// Objetos
var esfera, conjunto, board,select = null;
var materialUsuario;
var moving = false, animationIter = null;

// Control
var cameraControls, effectControls;

// Temporales
var angulo = 0;
var antes = Date.now();

// Variables para video --------------------------------------
var video, videoImage, videoImageContent, videoTexture;
// -----------------------------------------------------------

// Movimiento del soldado ++++++++++++++++++++++++++++++++++++
var salto, volver;
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// Minicamara ................................................
var minicam
// loader
var objLoader = new THREE.ObjectLoader();
var tex1p, tex2p
// luces
var ambiental, direccional, puntual,focal

async function start(){
	await init();
	await loadScene();
	setupGUI();
	render();
}
start()

// Acciones
var fichaAltura = {
	Pawn:0.7,
	Rook:0.4,
	Knight:0.9,
	Bishop:0.5,
	King:0.5,
	Queen:0.5
}

async function init() {
	// Funcion de inicializacion de motor, escena y camara

	// Motor de render
	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( new THREE.Color(0x000000) );
	renderer.shadowMap.enabled = true;
    renderer.autoClear = false; // <.......................
	document.getElementById('container').appendChild(renderer.domElement);

	// Escena
	scene = new THREE.Scene();

	// Camara
	var aspectRatio = window.innerWidth/window.innerHeight;
	camera = new THREE.PerspectiveCamera( 75, aspectRatio, 0.1, 100 );	// Perspectiva
	//camera = new THREE.OrthographicCamera( -10,10, 10/aspectRatio, -10/aspectRatio, 0.1, 100); //Ortografica
	camera.position.set( 0.5, 9, 5 );
	camera.lookAt( new THREE.Vector3( 0,0,0 ) );
    scene.add(camera);

	// Control de camara
	cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
	cameraControls.target.set( 0, 0, 0 );
	cameraControls.noZoom = false;

    // Minicam .....................................................
    minicam = new THREE.OrthographicCamera(-10,10, 10,-10, -10,100);
    minicam.position.set(0,1,0);
    minicam.up.set(0,0,-1);
    minicam.lookAt(0,-1,0);
    scene.add(minicam);
    // .............................................................

	// Luces
	ambiental = new THREE.AmbientLight(0x222222);
	scene.add(ambiental);

	direccional = new THREE.DirectionalLight( 0xFFFFFF, 0.2 );
	direccional.position.set( 0,1,0 );
	scene.add( direccional );

	puntual = new THREE.PointLight( 0xFFFFFFF, 0.3 );
	puntual.position.set( 2, 7, -4 );
	scene.add( puntual );

	focal = new THREE.SpotLight( 0xFFFFFF, 0.5 );
	focal.position.set( 0, 7, 0 );
	focal.target.position.set( 0,0,0 );
	focal.angle = Math.PI/5;
	focal.penumbra = 0.5;
	focal.castShadow = true;

	scene.add( focal );

	// Atender al eventos
	window.addEventListener( 'resize', updateAspectRatio );
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++
    renderer.domElement.addEventListener('click',mover);
}

function getBoardPosition(x,y,type) {
	
	return {
		x: 0.5625+ (x-1)* 1.125 - 4.5,
		y: fichaAltura[type],
		z: (9-y)*1.125 - 0.5625 - 4.5
	}
	//return new THREE.Vector3(0.5625+ (x-1)* 1.125 - 4.5,0.8,(9-y)*1.125 - 0.5625 - 4.5)

}
function getBoardIndex(p,world=false) {
	var coor = p;
	if(world){
		coor = board.worldToLocal(p)
	}
	console.log(coor)
	return {
		x: Math.floor((coor.x + 4.5)/1.125)+1 ,
		y: 8-Math.floor((coor.z + 4.5)/1.125)
	}
	

}

function* animation(miliseconds, ini, dst) {
	var startTime = Date.now()
	var now = 0
	while(now < miliseconds){
		now = Date.now()- startTime;
		yield ini.clone().lerpVectors(ini,dst,now / miliseconds)
	}
	yield dst
}

function generaFicha(tipo, nombre,indx,indy,mat){
	
	return new Promise((resolve,reject) => {
		objLoader.load( 'models/fichas/'+tipo+'.json', 
		         function (objeto){
					//objeto = new THREE.Mesh(objeto.geometry, mat)
                    objeto.material = mat
					objeto.name = nombre
					var pos = getBoardPosition(indx,indy,nombre)
		         	objeto.position.set(pos.x,pos.y,pos.z)
					objeto.scale.setScalar(0.3)
					objeto.castShadow = true;
					objeto.tag = 'ficha'

					resolve(objeto);
		         });
	})
}

function jsonLoader(url) {
	return new Promise((resolve) => {
		new THREE.FileLoader().load(url, (data) => { resolve(JSON.parse(data))});
	})

} 
function materialLoader(url) {
	return new Promise((resolve,reject) => {
		objLoader.load( url, 
		         function (objeto){

					resolve(objeto.material);
		         });
	})
}
async function genera1pFichas() {
	var mat1p = await materialLoader('models/fichas/1pMat.json')
	
	for(let i = 1 ; i < 9; i++){
		var ficha = await generaFicha('chessPawn','Pawn',i,2,mat1p)
		board.add(ficha)
		mat1p = mat1p.clone()
	}
	board.add(await generaFicha('chessRook','Rook',1,1,mat1p)) 
	mat1p = mat1p.clone()
	board.add(await generaFicha('chessRook','Rook',8,1,mat1p)) 
	mat1p = mat1p.clone()
	ficha = await generaFicha('chessKnight','Knight',2,1,mat1p)
	mat1p = mat1p.clone()
	ficha.scale.setScalar(0.15)
	ficha.rotateY(Math.PI)
	board.add(ficha) 
	ficha = await generaFicha('chessKnight','Knight',7,1,mat1p)
	mat1p = mat1p.clone()
	ficha.scale.setScalar(0.15)
	ficha.rotateY(Math.PI)
	board.add(ficha)
	board.add(await generaFicha('chessBishop','Bishop',3,1,mat1p)) 
	mat1p = mat1p.clone()
	board.add(await generaFicha('chessBishop','Bishop',6,1,mat1p)) 
	mat1p = mat1p.clone()
	board.add(await generaFicha('chessKing','King',4,1,mat1p)) 
	mat1p = mat1p.clone()
	board.add(await generaFicha('chessQueen','Queen',5,1,mat1p)) 
	mat1p = mat1p.clone()
}
async function genera2pFichas() {
	var mat2p = await materialLoader('models/fichas/2pMat.json')
	
	for(let i = 1 ; i < 9; i++){
		var ficha = await generaFicha('chessPawn','Pawn',i,7,mat2p)
		board.add(ficha)
		mat2p = mat2p.clone()
	}
	board.add(await generaFicha('chessRook','Rook',1,8,mat2p)) 
	mat2p = mat2p.clone()
	board.add(await generaFicha('chessRook','Rook',8,8,mat2p)) 
	mat2p = mat2p.clone()
	ficha = await generaFicha('chessKnight','Knight',2,8,mat2p)
	mat2p = mat2p.clone()
	ficha.scale.setScalar(0.15)
	board.add(ficha) 
	ficha = await generaFicha('chessKnight','Knight',7,8,mat2p)
	mat2p = mat2p.clone()
	ficha.scale.setScalar(0.15)
	board.add(ficha)
	board.add(await generaFicha('chessBishop','Bishop',3,8,mat2p)) 
	mat2p = mat2p.clone()
	board.add(await generaFicha('chessBishop','Bishop',6,8,mat2p)) 
	mat2p = mat2p.clone()
	board.add(await generaFicha('chessKing','King',4,8,mat2p)) 
	mat2p = mat2p.clone()
	board.add(await generaFicha('chessQueen','Queen',5,8,mat2p)) 
	mat2p = mat2p.clone()
}
async function loadScene() {
	// Construye el grafo de escena
	// - Objetos (geometria, material)
	// - Transformaciones 
	// - Organizar el grafo

	var path = "images/";

	// Objeto contenedor de cubo y esfera
	conjunto = new THREE.Object3D();
    conjunto.name = 'conjunto';
	conjunto.position.y = 1;

	// Board ---------------------------------------------------------


	var boardTex = new THREE.TextureLoader().load( 'models/fichas/chessboard_wood.jpg' );
    var geoBoard = new THREE.BoxGeometry(9,1,9);
	var boardMat = new THREE.MeshStandardMaterial( { map: boardTex } );
    board = new THREE.Mesh( geoBoard, boardMat );
    board.name = 'board';
    board.position.x = 0
	board.position.y = 0
	board.position.z = 0
    board.receiveShadow = board.castShadow = true; 
	await genera1pFichas()
	await genera2pFichas()

    // --------------------------------------------------------------

	// Esfera
	var entorno = [ path+"posx.jpg" , path + "negx.jpg",
	                path+"posy.jpg" , path + "negy.jpg",
	                path+"posz.jpg" , path + "negz.jpg"];


	
	var texEsfera = new THREE.CubeTextureLoader().load( entorno );
	// Habitacion
	var shader = THREE.ShaderLib.cube;
	shader.uniforms.tCube.value = texEsfera;

	var matParedes = new THREE.ShaderMaterial( {
						vertexShader: shader.vertexShader,
						fragmentShader: shader.fragmentShader,
						uniforms: shader.uniforms,
						depthWrite: false,
						side: THREE.BackSide
	} );

	var habitacion = new THREE.Mesh( new THREE.CubeGeometry(30,30,30), matParedes );
    habitacion.name = 'habitacion';

	// Grafo
	scene.add( board );
	scene.add( new THREE.AxesHelper(3) );
	scene.add( habitacion );
}

function updateAspectRatio()
{
	// Mantener la relacion de aspecto entre marco y camara

	var aspectRatio = window.innerWidth/window.innerHeight;
	// Renovar medidas de viewport
	renderer.setSize( window.innerWidth, window.innerHeight );
	// Para la perspectiva
	camera.aspect = aspectRatio;
	// Para la ortografica
	// camera.top = 10/aspectRatio;
	// camera.bottom = -10/aspectRatio;

	// Hay que actualizar la matriz de proyeccion
	camera.updateProjectionMatrix();
}

function setupGUI()
{
	// Interfaz grafica de usuario 

	// Controles
	effectControls = {
		ambientOn: true,
		direccionalOn: true,
		puntualOn: true,
		focalOn: true,
		ambientColor: "rgb(255,255,255)",
		direccionalColor: "rgb(255,255,255)",
		puntualColor: "rgb(255,255,255)",
		focalColor: "rgb(255,255,255)",
		ambientalIntensidad: 0.4,
		direccionalIntensidad: 0.4,
		puntualIntensidad: 0.4,
		focalIntensidad: 0.4
	};

	// Interfaz
	var gui = new dat.GUI();
	var folder = gui.addFolder("Interfaz ajedrez World");
	folder.add( effectControls, "ambientOn" ).name("Activar ambiente luz");
	folder.addColor( effectControls, "ambientColor" ).name("Ambiente color");
	folder.add( effectControls, "ambientalIntensidad", 0.0, 3.0, 0.1 ).name("Ambiente intensidad");
	folder.add( effectControls, "direccionalOn" ).name("Activar direccional luz");
	folder.addColor( effectControls, "direccionalColor" ).name("Direccional color");
	folder.add( effectControls, "direccionalIntensidad", 0.0, 3.0, 0.1 ).name("Direccional intensidad");
	folder.add( effectControls, "puntualOn" ).name("Activar puntual luz");
	folder.addColor( effectControls, "puntualColor" ).name("Puntual color");
	folder.add( effectControls, "puntualIntensidad", 0.0, 3.0, 0.1 ).name("Puntual intensidad");
	folder.add( effectControls, "focalOn" ).name("Activar focal luz");
	folder.addColor( effectControls, "focalColor" ).name("Focal color");
	folder.add( effectControls, "focalIntensidad", 0.0, 3.0, 0.1 ).name("Focal intensidad");
	
}

function updateLight () {
	ambiental.color.set(effectControls.ambientColor)
	ambiental.visible = effectControls.ambientOn
	direccional.color.set(effectControls.direccionalColor)
	direccional.visible = effectControls.direccionalOn
	puntual.color.set(effectControls.puntualColor)
	puntual.visible = effectControls.puntualOn
	focal.color.set(effectControls.focalColor)
	focal.visible = effectControls.focalOn
	ambiental.intensity = effectControls.ambientalIntensidad
	direccional.intensity = effectControls.direccionalIntensidad
	puntual.intensity = effectControls.puntualIntensidad
	focal.intensity = effectControls.focalIntensidad
} 
function update()
{
	updateLight() 
	// Cambiar propiedades entre frames
	// Tiempo transcurrido
	var ahora = Date.now();
	// Incremento de 20º por segundo
	angulo += Math.PI/9 * (ahora-antes)/1000;
	antes = ahora;
	
	if(moving){
		var step = animationIter.next()
		if(!step.done){
			select.position.copy(step.value)
		}
		else{
			moving = false
			animationIter = null
			select.material.emissive.set('white')
			select = null
		}
	}


}

function mover(event) // ++++++++++++++++++++++++++++++++++++++++
{
    // Callback de atencion al click
	if(moving)
		return
    // Localizar la posicion del click en coordenadas de ventana
    var x = event.clientX;
    var y = event.clientY;

    // Normalizar al espacio de 2x2 centrado
    x = x * 2/window.innerWidth - 1;
    y = -y * 2/window.innerHeight + 1;

    // Construir el rayo que pasa por el punto de vista y el punto x,y
    var rayo = new THREE.Raycaster();
    rayo.setFromCamera( new THREE.Vector2(x,y), camera);

    // Calcular interseccion con objetos de la escena
    var interseccion = rayo.intersectObjects( scene.children, true );
    for(var obj of interseccion){
		// Ver si es el soldado
		if(select){
			console.log(select)
			if(obj.object.name == 'board'){
				var index = getBoardIndex(obj.point,true)
				moving = true
				animationIter = animation(1000,select.position.clone(), getBoardPosition(index.x,index.y,select.name))
				return
			}
		}
		else {
			if(obj.object.tag == 'ficha'){
				select = obj.object
				select.material.emissive.set('red')
				console.log(select)
				return
			}
		} 
		if(select){
			select.material.emissive.set('white')
			select = null
		} 
		
	}
}
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


function render() {
	// Blucle de refresco
	requestAnimationFrame( render );
	update();

    renderer.clear();

    renderer.setViewport(0,0,window.innerWidth,window.innerHeight);
	renderer.render( scene, camera );

    renderer.setViewport( 10,10,200,200 );
    renderer.render( scene, minicam );
}
