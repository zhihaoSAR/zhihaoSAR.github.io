/*
** Seminario #3: Iluminacion y Materiales
** @author: rvivo@upv.es
** @date: 3-03-2021
** @dependencies: OrbitControls.js, Tween.js, dat.gui.min.js
*/

"use strict";

// Variables globales estandar
var renderer, scene, camera;

// Objetos
var esfera, conjunto, cubo;
var materialUsuario;

// Control
var cameraControls, effectControls;

// Temporales
var angulo = 0;
var antes = Date.now();

// Acciones
init();
loadScene();
setupGUI();
render();

function init() {
	// Funcion de inicializacion de motor, escena y camara

	// Motor de render
	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( new THREE.Color(0x000000) );
	renderer.shadowMap.enabled = true;
	document.getElementById('container').appendChild(renderer.domElement);

	// Escena
	scene = new THREE.Scene();

	// Camara
	var aspectRatio = window.innerWidth/window.innerHeight;
	camera = new THREE.PerspectiveCamera( 75, aspectRatio, 0.1, 100 );	// Perspectiva
	//camera = new THREE.OrthographicCamera( -10,10, 10/aspectRatio, -10/aspectRatio, 0.1, 100); //Ortografica
	camera.position.set( 0.5, 2, 5 );
	camera.lookAt( new THREE.Vector3( 0,0,0 ) );

	// Control de camara
	cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
	cameraControls.target.set( 0, 0, 0 );
	cameraControls.noZoom = false;

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
}

function loadScene() {
	// Construye el grafo de escena
	// - Objetos (geometria, material)
	// - Transformaciones 
	// - Organizar el grafo

	var path = "images/";

	// Objeto contenedor de cubo y esfera
	conjunto = new THREE.Object3D();
	conjunto.position.y = 1;

	// Cubo
	var loaderCubo = new THREE.TextureLoader();
	var texCubo = loaderCubo.load( path+"wood512.jpg" );
	texCubo.minFilter = THREE.LinearFilter;
	texCubo.magFilter = THREE.LinearFilter;

	var geoCubo = new THREE.BoxGeometry(2,2,2);
	var matCubo = new THREE.MeshLambertMaterial( {color:'green', map: texCubo } );
	cubo = new THREE.Mesh( geoCubo, matCubo );
	cubo.position.x = 2;
	cubo.receiveShadow = cubo.castShadow = true;

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
	suelo.rotation.x = -Math.PI/2;
	suelo.position.y = -0.1;
	suelo.receiveShadow = true;

	// Objeto importado
	var loader = new THREE.ObjectLoader();
	loader.load( 'models/soldado/soldado.json', 
		         function (objeto){
		         	objeto.position.y = 1;
		         	cubo.add(objeto);
					var txsoldado = new THREE.TextureLoader().load('models/soldado/soldado.png');
					objeto.material.setValues({map:txsoldado});
					objeto.castShadow = true;
		         	// Movimiento interpolado del objeto
		         	var salto = new TWEEN.Tween( objeto.position ).
		         	            to( {x: [0.2,0.3,0.5],
		         	            	 y: [2.1,2.3,1.0],
		         	            	 z: [0,0,0]}, 1000);
		         	salto.easing( TWEEN.Easing.Bounce.Out );
		         	salto.interpolation( TWEEN.Interpolation.Bezier );
		         	salto.start();

		         	var volver = new TWEEN.Tween( objeto.position );
		         	volver.to( {x:0,y:1,z:0}, 2000);
		         	salto.chain( volver );
		         	volver.chain( salto );

		         });

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

	// Grafo
	conjunto.add( cubo );
	conjunto.add( esfera );
	scene.add( conjunto );
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

	esfera.rotation.y = angulo;
	conjunto.rotation.y = angulo/10;

	// Cambio por demanda de usuario
	conjunto.position.y = effectControls.posY;
	esfera.position.x = -effectControls.separacion;
	cubo.visible = effectControls.caja;
	materialUsuario.setValues( {color:effectControls.color} );

	// Actualizar interpoladores
	TWEEN.update();
}

function render() {
	// Blucle de refresco
	requestAnimationFrame( render );
	update();
	renderer.render( scene, camera );
}
