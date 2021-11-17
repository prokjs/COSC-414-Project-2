var vertexShaderText = 
[
'precision mediump float;',
'',
'attribute vec3 vertPosition;',
'attribute vec3 vertColor;',
'varying vec3 fragColor;',
'uniform mat4 mWorld;',
'uniform mat4 mView;',
'uniform mat4 mProj;',
'',
'void main()',
'{',
'  fragColor = vertColor;',
'  gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);',
'}'
].join('\n');

var fragmentShaderText =
[
'precision mediump float;',
'',
'varying vec3 fragColor;',
'void main()',
'{',
'  gl_FragColor = vec4(fragColor, 1.0);',
'}'
].join('\n');

var InitDemo = function () {
	var dragging = false;
	var lastX = 0;
	var lastY = 0;
	var angleX = 0;
	var angleY = 0;

	var sphereVertices;
	var sphereIndices;
	var circleVertices;
	var circleIndices;
	var poisonSphereVertices;
	var poisonSphereIndices;

	//Rate that radius of bacteria grows at
	const RADIUS_PER_SECOND = 0.01;
	const POISONRADIUS_PER_SECOND = 0.05;

	var finalScore = 0;
	//Game over = false;
	var gameState = true;
	//Counts have many triangles have reached max size.
	var maxSizeReached = 0;
	//Score of the game
	var totalScore = 0;
	//Number of bacteria that starts
	var numBacteria = 1+Math.round(Math.random() * 10);
	// var numBacteria = 1;
	//Stores data of colours clicked on
	var data = new Uint8Array(4);
	//Initializing previous time
	var last = new Array(numBacteria);
	//Size of section (Game over when = 30.0)
	var circleSize = new Array(numBacteria);
	//The random color of the bacteria
	var colorStart = new Array(numBacteria);
	
	var poisonSphereSize = new Array(numBacteria);
	var poisonAngleX = new Array(numBacteria);
	var poisonAngleY = new Array(numBacteria);
	var poisonColor = [0.5,0.1,0.9];
	var data = new Uint8Array(4);
	//Measures the current maximum number of bacteria that are present
	var currentBacteriaNumber = 0;
	//Array of delay between bacteria spawn
	var delayPerBacteria = new Array(numBacteria);
	
	var tempClickConfirm;

	var poison = false;
	var deadCount = 0;
	var currentTime = Date.now();
	//Time of start of game
	var spawnTime = Date.now();

	//Keeps track of outer angle of bacteria
	var xAngle = new Array(numBacteria);
	var yAngle = new Array(numBacteria);

	var isDead = new Array(numBacteria);
	var isMaxSize = new Array(numBacteria);

	//score variables
	var tempClickConfirm;
	var tempScore;
	var totalScore;
	var finalScore;
	var scoretimer = Date.now();
	//end of score variables

	//wincon variables
	var gameState = true;
	var maxSizeReached = 0;
	var deadCount;
	//end of wincon variables


	generateBacteria(numBacteria);
	bacteriaDelay(numBacteria);

	//Generate random number of time for delay between bacteria spawn
	function bacteriaDelay(numBacteria) {
		for (i = 0; i <= numBacteria; i++) {
			delayPerBacteria[i] = Math.random() * 3.0 * 1000;
		}
	}

	var matWorldUniformLocation;
	var matViewUniformLocation;
	var matProjUniformLocation;
	var worldMatrix = new Float32Array(16);
	var viewMatrix = new Float32Array(16);
	var projMatrix = new Float32Array(16);
	var positionAttribLocation;
	var colorAttribLocation;

	var sphereVertexBufferObject;
	var sphereIndexBufferObject;
	var sphereXRotationMatrix = new Float32Array(16);
	var sphereYRotationMatrix = new Float32Array(16);
	var sphereIdentityMatrix = new Float32Array(16);

	var circleVertexBufferObject;
	var circleIndexBufferObject;
	var circleXRotationMatrix = new Float32Array(16);
	var circleYRotationMatrix = new Float32Array(16);
	var circleIdentityMatrix = new Float32Array(16);

	var poisonSphereVertexBufferObject;
	var poisonSphereIndexBufferObject;
	var poisonSphereXRotationMatrix = new Float32Array(16);
	var poisonSphereYRotationMatrix = new Float32Array(16);
	var poisonSphereIdentityMatrix = new Float32Array(16);

	console.log('This is working');

	var canvas = document.getElementById('game-surface');
	var gl = canvas.getContext('webgl', {preserveDrawingBuffer: true} );

	if (!gl) {
		console.log('WebGL not supported, falling back on experimental-webgl');
		gl = canvas.getContext('experimental-webgl');
	}

	if (!gl) {
		alert('Your browser does not support WebGL');
	}

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.cullFace(gl.BACK);

	//
	// Create shaders
	// 
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

	gl.shaderSource(vertexShader, vertexShaderText);
	gl.shaderSource(fragmentShader, fragmentShaderText);

	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		console.error('ERROR compiling vertex shader!', gl.getShaderInfoLog(vertexShader));
		return;
	}

	gl.compileShader(fragmentShader);
	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		console.error('ERROR compiling fragment shader!', gl.getShaderInfoLog(fragmentShader));
		return;
	}

	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('ERROR linking program!', gl.getProgramInfoLog(program));
		return;
	}
	gl.validateProgram(program);
	if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
		console.error('ERROR validating program!', gl.getProgramInfoLog(program));
		return;
	}

	//Changes angle and color of certain bacteria
	function generateBacteria(numBacteria) {
		for (i = 0; i <= numBacteria; i++) {
			//The random angle that the bacteria starts at
			xAngle[i] = Math.round(Math.random() * 2 * 3.1419592 * 100) / 100;
			yAngle[i] = Math.round(Math.random() * 2 * 3.1419592 * 100) / 100;
			//The random color of the bacteria
			colorStart[i] = [(0.1+Math.random()).toFixed(2),(0.1+Math.random()).toFixed(2),(0.1+Math.random()).toFixed(2)];
			//Initializing last recorded time of section size change per bacteria
			last[i] = 0.0;
			//Initializing section size of bacteria
			circleSize[i] = 0.00;
			isDead[i] = false;
			isMaxSize[i] = false;
		}
	}

	//
	// Create buffer
	//
	function createSphere(lat, long, radius, sphereColor) {
		sphereVertices = [];
		sphereIndices = [];
		for (var a=0; a <= lat; a++) {
			var theta = a * Math.PI / lat;
			var sinTheta = Math.sin(theta);
			var cosTheta = Math.cos(theta);

			for (var b=0; b <= long; b++) {
				var phi = b * 2 * Math.PI / long;
				var sinPhi = Math.sin(phi);
				var cosPhi = Math.cos(phi);

				var x = cosPhi * sinTheta;
				var y = cosTheta;
				var z = sinPhi * sinTheta;

				sphereVertices.push(radius * x);
				sphereVertices.push(radius * y);
				sphereVertices.push(radius * z);
				sphereVertices.push(sphereColor[0]);
				sphereVertices.push(sphereColor[1]);
				sphereVertices.push(sphereColor[2]);

				var first = (a * (long + 1)) + b;
				var second = first + long + 1;
				sphereIndices.push(first);
				sphereIndices.push(second);
				sphereIndices.push(first + 1);

				sphereIndices.push(second);
				sphereIndices.push(second + 1);
				sphereIndices.push(first + 1);
			}
		}
	}

	function createCirclePatch(sSize, startAngle, pieceSize, cSize, circleColor) {
		circleVertices = [];
		circleIndices = [];
		circleVertices = circleVertices.concat([sphereVertices[0],sphereVertices[1],sphereVertices[2]]);
		circleVertices = circleVertices.concat(circleColor);
		var theta = startAngle + (i * Math.PI / pieceSize);
		circleVertices = circleVertices.concat([
			sphereVertices[0] + Math.sin(theta) * cSize,
			sphereVertices[1],
			sphereVertices[2] + Math.cos(theta) * cSize 
		]);
		circleVertices = circleVertices.concat(circleColor);
		for (var i = 1.0; i <= sSize; i += 1) {
			//Compute the angle in radians for each triangle in the circle
			var theta = startAngle + (i * Math.PI / pieceSize);

			//Compute vertices of each triangle
			var vert1 = [
				sphereVertices[0] + Math.sin(theta) * cSize,
				sphereVertices[1],
				sphereVertices[2] + Math.cos(theta) * cSize 
			]
			circleVertices = circleVertices.concat(vert1);
			circleVertices = circleVertices.concat(circleColor);
			circleIndices = circleIndices.concat([0, i, i+1]);
		}
	}

	function createPoisonSphere(lat, long, radius, sphereColor) {
		poisonSphereVertices = [];
		poisonSphereIndices = [];
		for (var a=0; a <= lat; a++) {
			var theta = a * Math.PI / lat;
			var sinTheta = Math.sin(theta);
			var cosTheta = Math.cos(theta);

			for (var b=0; b <= long; b++) {
				var phi = b * 2 * Math.PI / long;
				var sinPhi = Math.sin(phi);
				var cosPhi = Math.cos(phi);

				var y = cosPhi * sinTheta;
				var x = cosTheta;
				var z = sinPhi * sinTheta;

				poisonSphereVertices.push(radius * x);
				poisonSphereVertices.push(radius * y);
				poisonSphereVertices.push(radius * z);
				poisonSphereVertices.push(sphereColor[0]);
				poisonSphereVertices.push(sphereColor[1]);
				poisonSphereVertices.push(sphereColor[2]);

				var first = (a * (long + 1)) + b;
				var second = first + long + 1;
				poisonSphereIndices.push(first);
				poisonSphereIndices.push(second);
				poisonSphereIndices.push(first + 1);

				poisonSphereIndices.push(second);
				poisonSphereIndices.push(second + 1);
				poisonSphereIndices.push(first + 1);
			}
		}
	}

	function drawSphere(startAngleX,startAngleY,sphereLength) {
		sphereVertexBufferObject = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexBufferObject);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereVertices), gl.STATIC_DRAW);

		sphereIndexBufferObject = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIndexBufferObject);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(sphereIndices), gl.STATIC_DRAW);

		positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
		colorAttribLocation = gl.getAttribLocation(program, 'vertColor');
		gl.vertexAttribPointer(
			positionAttribLocation, // Attribute location
			3, // Number of elements per attribute
			gl.FLOAT, // Type of elements
			gl.FALSE,
			6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
			0 // Offset from the beginning of a single vertex to this attribute
		);
		gl.vertexAttribPointer(
			colorAttribLocation, // Attribute location
			3, // Number of elements per attribute
			gl.FLOAT, // Type of elements
			gl.FALSE,
			6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
			3 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
		);

		gl.enableVertexAttribArray(positionAttribLocation);
		gl.enableVertexAttribArray(colorAttribLocation);

		mat4.identity(sphereIdentityMatrix);
		mat4.rotate(sphereYRotationMatrix, sphereIdentityMatrix, angleY+startAngleY, [0, 1, 0]);
		mat4.rotate(sphereXRotationMatrix, sphereIdentityMatrix, angleX+startAngleX, [1, 0, 0]);
		mat4.mul(worldMatrix, sphereYRotationMatrix, sphereXRotationMatrix);
		gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);

		gl.drawElements(gl.TRIANGLES, sphereIndices.length/(sphereLength), gl.UNSIGNED_BYTE, 0);
	}

	function drawCirclePatch(startAngleX,startAngleY) {
		circleVertexBufferObject = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, circleVertexBufferObject);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);

		circleIndexBufferObject = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBufferObject);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(circleIndices), gl.STATIC_DRAW);

		positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
		colorAttribLocation = gl.getAttribLocation(program, 'vertColor');
		gl.vertexAttribPointer(
			positionAttribLocation, // Attribute location
			3, // Number of elements per attribute
			gl.FLOAT, // Type of elements
			gl.FALSE,
			6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
			0 // Offset from the beginning of a single vertex to this attribute
		);
		gl.vertexAttribPointer(
			colorAttribLocation, // Attribute location
			3, // Number of elements per attribute
			gl.FLOAT, // Type of elements
			gl.FALSE,
			6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
			3 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
		);

		gl.enableVertexAttribArray(positionAttribLocation);
		gl.enableVertexAttribArray(colorAttribLocation);

		mat4.identity(circleIdentityMatrix);
		if (startAngleY < Math.PI && startAngleX < Math.PI) {
			mat4.rotate(circleYRotationMatrix, circleIdentityMatrix, angleY+startAngleY, [0, -1, 0]);
			mat4.rotate(circleXRotationMatrix, circleIdentityMatrix, angleX+startAngleX, [-1, 0, 0]);
			mat4.mul(worldMatrix, circleYRotationMatrix, circleXRotationMatrix);
			gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
		} else if (startAngleY < Math.PI && startAngleX >= Math.PI) {
			mat4.rotate(circleYRotationMatrix, circleIdentityMatrix, angleY+startAngleY, [0, -1, 0]);
			mat4.rotate(circleXRotationMatrix, circleIdentityMatrix, angleX+startAngleX, [1, 0, 0]);
			mat4.mul(worldMatrix, circleYRotationMatrix, circleXRotationMatrix);
			gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
		} else if (startAngleY >= Math.PI && startAngleX < Math.PI) {
			mat4.rotate(circleYRotationMatrix, circleIdentityMatrix, angleY+startAngleY, [0, 1, 0]);
			mat4.rotate(circleXRotationMatrix, circleIdentityMatrix, angleX+startAngleX, [-1, 0, 0]);
			mat4.mul(worldMatrix, circleYRotationMatrix, circleXRotationMatrix);
			gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
		} else if (startAngleY >= Math.PI && startAngleX >= Math.PI){
			mat4.rotate(circleYRotationMatrix, circleIdentityMatrix, angleY+startAngleY, [0, 1, 0]);
			mat4.rotate(circleXRotationMatrix, circleIdentityMatrix, angleX+startAngleX, [1, 0, 0]);
			mat4.mul(worldMatrix, circleYRotationMatrix, circleXRotationMatrix);
			gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
		}
		
		gl.drawElements(gl.TRIANGLES, circleIndices.length/(1.107), gl.UNSIGNED_BYTE, 0);
	}

	function drawPoisonSphere(startAngleX,startAngleY,sphereLength) {
		poisonSphereVertexBufferObject = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, poisonSphereVertexBufferObject);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(poisonSphereVertices), gl.STATIC_DRAW);

		poisonSphereIndexBufferObject = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, poisonSphereIndexBufferObject);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(poisonSphereIndices), gl.STATIC_DRAW);

		positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
		colorAttribLocation = gl.getAttribLocation(program, 'vertColor');
		gl.vertexAttribPointer(
			positionAttribLocation, // Attribute location
			3, // Number of elements per attribute
			gl.FLOAT, // Type of elements
			gl.FALSE,
			6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
			0 // Offset from the beginning of a single vertex to this attribute
		);
		gl.vertexAttribPointer(
			colorAttribLocation, // Attribute location
			3, // Number of elements per attribute
			gl.FLOAT, // Type of elements
			gl.FALSE,
			6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
			3 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
		);

		gl.enableVertexAttribArray(positionAttribLocation);
		gl.enableVertexAttribArray(colorAttribLocation);

		mat4.identity(poisonSphereIdentityMatrix);
		mat4.rotate(poisonSphereYRotationMatrix, poisonSphereIdentityMatrix, angleY+(Math.PI-startAngleX), [0, -1, 0]);
		mat4.rotate(poisonSphereXRotationMatrix, poisonSphereIdentityMatrix, angleX+(Math.PI-startAngleY), [0, 0, -1]);
		mat4.mul(worldMatrix, poisonSphereYRotationMatrix, poisonSphereXRotationMatrix);
		gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);

		gl.drawElements(gl.TRIANGLES, poisonSphereIndices.length/(sphereLength), gl.UNSIGNED_BYTE, 0);
	}

	//Updates the section size per second of a single bacteria
	function updateRadiusSize(radiusSize, j) {
		if(gameState == true){
			var now = Date.now();

			var time = now - last[j];
			last[j] = now;
			return (radiusSize + (RADIUS_PER_SECOND * time) / 100.0);
		}
	}

	function updatePoisonRadiusSize(radiusSize, j) {
		// if(gameState == true){
			var now = Date.now();

			var time = now - last[j];
			last[j] = now;
			return (radiusSize - (POISONRADIUS_PER_SECOND * time) / 100.0);
		// }
	}

	//Check if the delay time has been met so that another bacteria can spawn
	function checkDelay(time, dPBacteria, cBNumber) {
		if (time - spawnTime >= dPBacteria[cBNumber]) {
			currentBacteriaNumber++;
			spawnTime = time;
		}
	}

	function sizeReached(index) {
		if (!isMaxSize[index]) {
			maxSizeReached++;
			isMaxSize[index] = true;
		}
	}

	function detect(){
		for(j = 0; j < colorStart.length; j++){
			tempData = [(data[0]/255).toFixed(2),(data[1]/255).toFixed(2),(data[2]/255).toFixed(2)]
			if((data[0]/255).toFixed(2) <= colorStart[j][0] + 0.1 & (data[0]/255).toFixed(2) >= colorStart[j][0] - 0.1
			& (data[1]/255).toFixed(2) <= colorStart[j][1] + 0.1 & (data[1]/255).toFixed(2) >= colorStart[j][1] - 0.1 
			& (data[2]/255).toFixed(2) <= colorStart[j][2] + 0.1 & (data[2]/255).toFixed(2) >= colorStart[j][2] - 0.1){
				tempClickConfirm = true;
				score();
				isDead[j] = true;
				circleSize[j] = 0;
				
				poison = true;
				poisonSphereSize[j] = 11;
				poisonAngleX[j] = xAngle[j];
				poisonAngleY[j] = yAngle[j];
			}
		}
	}
	
	function click(){
		canvas.addEventListener('click', (e) =>{
			const rect = canvas.getBoundingClientRect();
			
			mouseX = e.clientX - rect.left;
			mouseY = e.clientY - rect.top;
			
			var pixelX = mouseX * gl.canvas.width / gl.canvas.clientWidth; 
			
			var pixelY = gl.canvas.height - mouseY * gl.canvas.height/ gl.canvas.clientHeight - 1;
			
			gl.readPixels(pixelX,pixelY,1,1,gl.RGBA,gl.UNSIGNED_BYTE,data);
			
			const id = data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24);
			
			detect();
		});
	}

	// Tell OpenGL state machine which program should be active.
	gl.useProgram(program);	
	
	matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
	matViewUniformLocation = gl.getUniformLocation(program, 'mView');
	matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

	mat4.identity(worldMatrix);
	mat4.lookAt(viewMatrix, [0, 0, -8], [0, 0, 0], [0, 1, 0]);
	mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.clientWidth / canvas.clientHeight, 0.1, 1000.0);

	gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
	gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
	gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);
	
	//Animation loop. Function is called every frame.
	var loop = function () {
		for (i = 0; i <= currentBacteriaNumber; i++) {

			if (circleSize[i] < 1.0 && !isDead[i]) {
				circleSize[i] = updateRadiusSize(circleSize[i], i);
			} else if (circleSize[i] >= 1.0 && !isDead[i]){
				sizeReached(i);	
			}
			if (circleSize[i] >= 1.1) {
				circleSize[i] = 0.0;
			}
			if(poison == true){
				
				if(poisonSphereSize[i] >= 1.107){
					poisonSphereSize[i] = updatePoisonRadiusSize(poisonSphereSize[i], i);
				}
				if(poisonSphereSize[i] < 1.107){
					poisonSphereSize[i] = 1.107;
				}
			}
			
		}

		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
		for (i = 0; i <= currentBacteriaNumber; i++) {
			if(poison == false){
				createSphere(10,20,2.5,[1.0,1.0,1.0]);
				drawSphere(0,0,1.107);
				createCirclePatch(210, 0, 90, circleSize[i], colorStart[i]);
				drawCirclePatch(xAngle[i],yAngle[i]);
			} else {
				createSphere(10,20,2.5,[1.0,1.0,1.0]);
				drawSphere(0,0,1.107);
				createPoisonSphere(10,20,2.8,poisonColor);
				drawPoisonSphere(poisonAngleX[i],poisonAngleY[i],poisonSphereSize[i]);
				createCirclePatch(210, 0, 90, circleSize[i], colorStart[i]);
				drawCirclePatch(xAngle[i],yAngle[i]);
			}
		}

		currentTime = Date.now();
		checkDelay(currentTime, delayPerBacteria, currentBacteriaNumber);
		winCondition();
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);

	var read = function(){
		canvas.addEventListener('mousedown', (e) => {
			// if (color is white) {
			dragging = true;
			// }
		});
		canvas.addEventListener('mouseup', (e) => {
			dragging = false;
		});
		canvas.addEventListener('mousemove', (e) => {
			var x = e.clientX;
			var y = e.clientY;
			if (dragging) {
			// The rotation speed factor
			// dx and dy here are how for in the x or y direction the mouse moved
			var factor = 5/canvas.clientHeight;
			var dx = factor * (x - lastX);
			var dy = factor * (y - lastY);
		
			// update the latest angle
			angleX = angleX + dy;
			angleY = angleY - dx;
			}
			// update the last mouse position
			lastX = x;
			lastY = y;
		});
		// window.addEventListener('keydown', (e) => {
		// 	for (i = 0; i <= numBacteria; i++) {
		// 		console.log(colorStart[i]+","+xAngle[i]+","+yAngle[i]+"\n");
		// 	}
		// });
	}
	read();
	click();
	function score(){
		// if there was a click on the bacteria
		if(tempClickConfirm == true){
			
			//The score is higher the smaller the bacteria is on click.
			tempScore = 30 - circleSize[j];
			totalScore += tempScore;
			//Resetting scoretimer and tempClickConfirm for the next click.
			tempClickConfirm = false;
			//print
			finalScore = totalScore / numBacteria;
			document.getElementById('curScore').innerHTML = finalScore.toFixed(2);
		}
    }

	function winCondition(){
		if(maxSizeReached == 2){
			gameState = false;
			finalScore = 0;
			document.getElementById('gameover').innerHTML = "Game Over";
			// console.log("Game Over");
		}
		for(x = 0; x <= numBacteria; x++){
			if(isDead[x] == true){
				deadCount++;
			}
		}
		if (deadCount == numBacteria+1){
			document.getElementById('uwin').innerHTML = "You Win!";
			gameState = false;
		}else{
			deadCount = 0;
		}
	}
};