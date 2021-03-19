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

async function start(){
	await init();
	await loadScene();
	setupGUI();
	render();
}
start()

// Acciones


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
	var ambiental = new THREE.AmbientLight(0x222222);
	scene.add(ambiental);

	var direccional = new THREE.DirectionalLight( 0xFFFFFF, 0.2 );
	direccional.position.set( 0,1,0 );
	scene.add( direccional );

	var puntual = new THREE.PointLight( 0xFFFFFFF, 0.3 );
	puntual.position.set( 2, 7, -4 );
	scene.add( puntual );

	var focal = new THREE.SpotLight( 0xFFFFFF, 0.5 );
	focal.position.set( -2, 7, 4 );
	focal.target.position.set( 0,0,0 );
	focal.angle = Math.PI/7;
	focal.penumbra = 0.5;
	focal.castShadow = true;

	scene.add( focal );

	// Atender al eventos
	window.addEventListener( 'resize', updateAspectRatio );
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++
    renderer.domElement.addEventListener('click',mover);
}

function getBoardPosition(x,y) {
	
	return {
		x: 0.5625+ (x-1)* 1.125 - 4.5,
		y: 0.8,
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
					objeto = new THREE.Mesh(objeto.geometry, mat)
                    //objeto.material = mat
					objeto.name = nombre
					var pos = getBoardPosition(indx,indy)
		         	objeto.position.set(pos.x,pos.y,pos.z)
					objeto.scale.setScalar(0.3)
					objeto.castShadow = true;
					objeto.tag = 'ficha'

					resolve(objeto);
		         });
	})
}

async function genera1pFichas() {
	var textLoader = new THREE.TextureLoader()
	//var envTex1p = textLoader.load( 'models/fichas/1p.png' );
	var envTex1p = THREE.ImageUtils.loadTexture('models/fichas/1p.png')
	var normalMap = textLoader.load( 'models/fichas/normal.png' );
	var mat1p = new THREE.MeshPhongMaterial({envMap:envTex1p, normalMap:normalMap,color:"white", specular: "white", emissive: "white", emissiveIntensity: 0.58})
	console.log(await fetch('models/fichas/model.json'))
	board.add(new THREE.Mesh(new THREE.BoxGeometry(5,5,5), mat1p))
	for(let i = 1 ; i < 9; i++){
		var ficha = await generaFicha('chessPawn','Pawn',i,2,mat1p)
		console.log(mat1p)
		console.log(ficha)
		board.add(ficha)
	}


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
	var boardMat = new THREE.MeshBasicMaterial( { map: boardTex } );
    board = new THREE.Mesh( geoBoard, boardMat );
    board.name = 'board';
    board.position.x = 0
	board.position.y = 0
	board.position.z = 0
    board.receiveShadow = board.castShadow = true; 
	console.log(geoBoard)
	await genera1pFichas()

    // --------------------------------------------------------------

	// Esfera
	var entorno = [ path+"posx.jpg" , path + "negx.jpg",
	                path+"posy.jpg" , path + "negy.jpg",
	                path+"posz.jpg" , path + "negz.jpg"];

	var texEsfera = new THREE.CubeTextureLoader().load( entorno );
	                
	var geoEsfera = new THREE.SphereGeometry( 1, 30, 30 );
	var matEsfera = new THREE.MeshPhongMaterial( {color:'yellow',
                                                  specular: 'gray',
                                                  shininess: 40,
                                                  envMap: texEsfera } );
	esfera = new THREE.Mesh( geoEsfera, matEsfera );
    esfera.name = 'esfera';
	esfera.receiveShadow = esfera.castShadow = true;

	// Suelo
	var texSuelo = new THREE.TextureLoader().load(path+"r_256.jpg");
	texSuelo.minFilter = THREE.LinearFilter;
	texSuelo.magFilter = THREE.LinearFilter;
	texSuelo.repeat.set( 2,3 );
	texSuelo.wrapS = texSuelo.wrapT = THREE.MirroredRepeatWrapping;

	var geoSuelo = new THREE.PlaneGeometry(10,10,100,100);
	var matSuelo = new THREE.MeshLambertMaterial( {color:'gray', map:texSuelo} );
	var suelo = new THREE.Mesh( geoSuelo, matSuelo );
    suelo.name = 'suelo';
	suelo.rotation.x = -Math.PI/2;
	suelo.position.y = -0.1;
	suelo.receiveShadow = true;

	// Objeto importado
	

	// Texto
	var fontLoader = new THREE.FontLoader();
	materialUsuario = new THREE.MeshPhongMaterial({color:'red',
                                                   specular: 'red',
                                                   shininess: 50 });
	fontLoader.load( 'fonts/gentilis_bold.typeface.json',
		             function(font){
		             	var geoTexto = new THREE.TextGeometry( 
		             		'soldado',
		             		{
		             			size: 0.5,
		             			height: 0.1,
		             			curveSegments: 3,
		             			style: "normal",
		             			font: font,
		             			bevelThickness: 0.05,
		             			bevelSize: 0.04,
		             			bevelEnabled: true
		             		});
		             	var texto = new THREE.Mesh( geoTexto, materialUsuario );
		             	texto.name = 'texto';
                        texto.receiveShadow = texto.castShadow = true;
		             	scene.add( texto );
		             	texto.position.x = -1;
		             });

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
	scene.add( suelo );
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
		mensaje: "Interfaz",
		posY: 1.0,
		separacion: [],
		caja: true,
		color: "rgb(255,0,0)"
	};

	// Interfaz
	var gui = new dat.GUI();
	var folder = gui.addFolder("Interfaz Soldado World");
	folder.add( effectControls, "mensaje" ).name("App");
	folder.add( effectControls, "posY", 1.0, 3.0, 0.1 ).name("Subir/Bajar");
	folder.add( effectControls, "separacion", {Ninguna:0, Media:1, Maxima:2} ).name("Separacion");
	folder.add( effectControls, "caja" ).name("Ver al soldado");
	folder.addColor( effectControls, "color" ).name("Color texto");
}

function update()
{
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
			select = null
		}
	}
	esfera.rotation.y = angulo;
	conjunto.rotation.y = angulo/10;

	// Cambio por demanda de usuario
	conjunto.position.y = effectControls.posY;
	esfera.position.x = -effectControls.separacion;
	board.visible = effectControls.caja;
	materialUsuario.setValues( {color:effectControls.color} );

	// Actualizar interpoladores
	TWEEN.update();

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
				animationIter = animation(1000,select.position.clone(), getBoardPosition(index.x,index.y))
				break
			}
		}
		else {
			if(obj.object.tag == 'ficha'){
				select = obj.object
				break
			}
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
