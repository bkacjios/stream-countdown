var settings = {
	background : {
		// Particles gravitate towards the middle of the screen
		gravitateMiddle : true,
		// Opacity of the particles so they don't overwhelm the logo and countdown
		opacity : 0.2,
	},
	stream : {
		channel : "ferrisstreamsstuff",
		day: 4,
		timezone : -1, // CET
		hour: 20,
		minute: 0,
	},
	DEBUG : false,
	DEBUG_LIVE : false,
	// Average FPS of last X frames
	DEBUG_FPS : 120,
}

var render = {
	// Generic starting values
	initialized : false,
	particles : [],
	linked : [],
	tau : Math.PI * 2,
	width : 1024,
	height : 1024,
	canvas : document.getElementById('renderer'),
	delta : 1/60,
};

render.ctx = render.canvas.getContext('2d');

var countdown = {
	// Use HEX values for binary effect
	characters : "ABCDEF0123456789",
	updates : {
		// When a certain number was updated
		days : 0,
		hours : 0,
		minutes : 0,
		seconds : 0,
	},
};

Math.clamp = function(a,b,c){
	return Math.max(b,Math.min(c,a));
}

Math.sinBetween = function(min, max, t)
{
	var halfRange = (max - min) / 2;
	return min + halfRange + Math.sin(t) * halfRange;
}

// determine browser requestAnimFrame..
window.requestAnimFrame = (function(){
	return	window.requestAnimationFrame       ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame    ||
			function( callback ){
				// Fallback to a good old window timeout.. GROSS
				window.setTimeout(callback, 1000 / 60);
			};
})();

window.onresize = function resize() {
	var dw = window.innerWidth - render.width;
	var dh = window.innerHeight - render.height;

	// Resize the canvas to fit the screen
	render.width = render.canvas.width = window.innerWidth;
	render.height = render.canvas.height = window.innerHeight;

	// Scale around 1080p
	render.scale = Math.clamp(render.height / 1080, 0.3, 1);

	// Adjust all the particles to stay within the window by scaling their X and Y axis
	for (var i = 0, p; p = render.particles[i]; i++) {
		p.x += (p.x/window.innerWidth) * dw;
		p.y += (p.y/window.innerHeight) * dh;
	}
}

window.onload = function(evt) {
	window.onresize();
	render.emitParticles(Math.floor(150 * render.scale))
	render.initialized = true;
};

render.getTime = function() {
	// Current time in seconds
	return Date.now()/1000;
}

render.emitParticles = function(num) {
	while (num--) {

		// A random theta..
		var theta = Math.random() * Math.PI * 2
		var phi = Math.acos( 2 * Math.random() - 1 )

		// Convert theta into a X and Y velocity
		var vx = Math.cos( theta ) * Math.sin( phi )
		var vy = Math.sin( theta ) * Math.sin( phi )
		//var vz = Math.cos( phi ) // Don't need this.. We ain't 3D!

		this.particles.push(
		{
			speed : render.random(50,125),
			radius : render.random(0.5,2),
			x : render.random(2,this.width-2),
			y : render.random(2,this.height-2),
			velocity : {
				x : vx,
				y : vy
			},
			id : num,
			linked : [],
		})
	}
}

render.random = function(min, max) {
	return Math.random() * (max - min) + min;
}

render.randomInt = function(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

render.draw = function(ctx) {
	// Clear the canvas
	ctx.clearRect(0,0,this.width,this.height);

	// Set opacity and color
	ctx.globalAlpha = settings.background.opacity;
	ctx.fillStyle = "white";

	// Around 100 pixels for connecting lines.. Scales with resolution
	var line = 100 * render.scale;

	for (var i = 0, p1; p1 = this.particles[i]; i++) {
		
		// Draw the particle as a filled dot
		ctx.beginPath();
		ctx.arc(p1.x, p1.y, p1.radius, 0, this.tau);
		ctx.fill();

		for (var j = 0, p2; p2 = this.particles[j]; j++) {

			// Skip particles that already are linked to eachother..
			// Without this, each dot would draw 2 lines per connection
			// SAVES DRAW CALLS
			if ((render.linked[p2.id] && render.linked[p2.id][p1.id]))
				continue;

			// Get the direction vector between the two particles
			var dx = p1.x - p2.x;
			var dy = p1.y - p2.y;

			// Calculate the distance
			var dist = Math.sqrt(dx*dx + dy*dy);

			if (!render.linked[p1.id])
				render.linked[p1.id] = [];

			if (dist <= line) {
				// Mark the particles as linked when they are close enough
				render.linked[p1.id][p2.id] = true;

				// Distance as a percent
				var per = 1-(dist/line);

				// Once the particle is the maximum distance away, 0 width!
				ctx.lineWidth = Math.min(p1.radius, p2.radius) * per;
				ctx.strokeStyle = "white";

				// Draw connecting line
				ctx.beginPath();
				ctx.moveTo(p1.x, p1.y);
				ctx.lineTo(p2.x, p2.y);
				ctx.stroke();
				ctx.closePath();
			} else {
				// Unlink the particles
				render.linked[p1.id][p2.id] = undefined;
			}
		}
	}

	// Get ready for drawing font
	ctx.globalAlpha = 1;
	ctx.font = "11px Courier New";
	ctx.fillStyle = "white";

	// Draw a locale clock!
	ctx.fillText(new Date().toLocaleTimeString('en-US', {
		hour: "numeric", 
		minute: "numeric"
	}), 8, 15)

	if (settings.DEBUG) {
		// Useful debugging stuff..
		ctx.fillText("Width     : " + this.width, 8, 25);
		ctx.fillText("Height    : " + this.height, 8,35);
		ctx.fillText("FPS       : " + this.getAverageFPS(), 8,45);
		ctx.fillText("particles : " + this.particles.length, 8, 55);
	}
}

render.update = function(dt) {
	var now = this.getTime();

	// Scale the velocity to add a slow motion/speed up effect
	var pulse = Math.sinBetween(0.05, 1, now*(60/76));

	for (var i = 0, p; p = this.particles[i]; i++) {
		// Simulate the velocity of the particles
		// Uses frame delta to have similar speeds at variable FPS
		p.x += p.velocity.x * p.speed * pulse * dt;
		p.y += p.velocity.y * p.speed * pulse * dt;

		if (settings.background.gravitateMiddle) {
			// Gravitational position, make this a setting?
			var dx = p.x - this.width/2;
			var dy = p.y - this.height/2;

			var dist = Math.sqrt(dx*dx + dy*dy);
			// Normalize the direction
			dx /= dist;
			dy /= dist;

			// Gravitate towards dx and dy
			p.velocity.x -= dx * p.radius * pulse * dt;
			p.velocity.y -= dy * p.radius * pulse * dt;
		}

		// Normal vector values for the edges of the screen
		var nx = 0;
		var ny = 0;

		// Particle is bouncing off the left
		if (p.x - p.radius <= 0) {
			p.x = p.radius;
			nx = 1;
		}

		// Particle is bouncing off the right
		if (p.x + p.radius >= this.width) {
			p.x = this.width - p.radius;
			nx = -1;
		}

		// Particle is bouncing off the top
		if (p.y - p.radius <= 0) {
			p.y = p.radius;
			ny = 1;
		}

		// Particle is boucning of the bottom
		if (p.y + p.radius >= this.height){
			p.y = this.height - p.radius;
			ny = -1;
		}

		// The particle has a collision normal vector? Bounce!
		if (nx != 0 || ny != 0) {
			// Simple bounce equation
			var dot = 2 * (p.velocity.x * nx + p.velocity.y * ny);

			// Apply new velocity after a bounce
			p.velocity.x = p.velocity.x - (nx * dot);
			p.velocity.y = p.velocity.y - (ny * dot);
		}
	}
}

countdown.randomChar = function() {
	return this.characters.charAt(Math.floor(Math.random() * this.characters.length));
}

countdown.renderBinary = function(e, val, type) {
	var now = render.getTime();
	var start = this.updates[type];
	var timePerLine = 0.75;

	// Only update the binary data when it needs to..
	if (now > start + timePerLine)
		return;

	if (typeof val ==='string')
		val = val.charCodeAt();

	var pad = '00000000';
	var bin = val.toString(2);
	var binary = pad.substring(bin.length) + bin;

	e.innerHTML = ''

	if (!this.live)
		e.innerHTML += type.toUpperCase();

	e.innerHTML += '</br>'

	e.innerHTML += '[';

	for(var j = 0; j < binary.length; j++) {
		// Create a cool effect as the binary is "updating"
		if (now <= start + ((j/8) * timePerLine))
			// Use a random character until the effect is done
			e.innerHTML += this.randomChar();
		else {
			// Use the final character
			e.innerHTML += binary.charAt(j);
		}
	}

	e.innerHTML += ']';
}

countdown.daysElmnt	= document.getElementById('d');
countdown.daysBin	= document.getElementById('dbin');
countdown.hourElmnt = document.getElementById('h');
countdown.hourBin	= document.getElementById('hbin');
countdown.minsElmnt	= document.getElementById('m');
countdown.minsBin	= document.getElementById('mbin');
countdown.secsElmnt = document.getElementById('s');
countdown.secsBin	= document.getElementById('sbin');

countdown.checkOnline = function(now) {

	// Only check if the streamer is live every minute..
	// May want to make this longer..?
	// TODO: Look up twitch's API rules..
	if (this.nextLiveCheck && now < this.nextLiveCheck)
		return;

	// Do it again 60 seconds from now
	this.nextLiveCheck = now + 60;

	$.ajax({
		type: 'GET',
		url: 'https://api.twitch.tv/kraken/streams/' + settings.stream.channel,
		headers: {
			'Client-ID': 'p59zoqvt4joe9gqzqbs5cycbhc3nr6'
		},
		success: function(data) {
			// If stream data, then we are live!
			var live = data.stream != null;

			if (settings.DEBUG_LIVE) {
				live = true;
			}

			if (countdown.live != live) {
				countdown.live = live;

				if (live) {
					countdown.daysElmnt.classList.add("live");
					countdown.hourElmnt.classList.add("live");
					countdown.minsElmnt.classList.add("live");
					countdown.secsElmnt.classList.add("live");
				} else {
					countdown.daysElmnt.classList.remove("live");
					countdown.hourElmnt.classList.remove("live");
					countdown.minsElmnt.classList.remove("live");
					countdown.secsElmnt.classList.remove("live");
				}
			}
		}
	});
}

countdown.nextStream = function() {
	// Use UTC time as a base so the timer is correct for everyone

	var next = new Date();

	// Calculate the amount of days left before the stream day..
	next.setUTCDate(next.getUTCDate() + (settings.stream.day - 1 - next.getUTCDay() + 7) % 7 + 1);

	// Set the time of day we stream
	next.setUTCHours(settings.stream.hour + settings.stream.timezone);
	next.setUTCMinutes(settings.stream.minute);
	next.setUTCSeconds(0);
	next.setUTCMilliseconds(0);

	// Convert to seconds
	return next.getTime()/1000;
}

countdown.draw = function(now) {
	var end = this.nextStream();
	var seconds = end - now;

	var days = Math.floor(seconds/86400);
	var daysRemain = seconds%86400;
	var hours = Math.floor(daysRemain/3600);
	var hourRemain = (seconds - 86400)%3600;
	var min = Math.floor(hourRemain/60);
	var sec = Math.floor(seconds%60);

	// If the stream is live, show L I V E in place of numbers
	if (this.live) {
		days = 'L';
		hours = 'I';
		min = 'V';
		sec = 'E';
	}

	// Day number needs an update..
	if (this.daysElmnt.innerHTML != days) {
		// Update it and mark the timestamp in which it was updated
		this.daysElmnt.innerHTML = days;
		this.updates.days = now;
	}

	// Render the binary effect..
	this.renderBinary(this.daysBin, days, "days")

	// Repeat for hours, minutes, seconds..

	if (this.hourElmnt.innerHTML != hours) {
		this.hourElmnt.innerHTML = hours;
		this.updates.hours = now;
	}

	this.renderBinary(this.hourBin, hours, "hours")

	if (this.minsElmnt.innerHTML != min) {
		this.minsElmnt.innerHTML = min;
		this.updates.minutes = now;
	}

	this.renderBinary(this.minsBin, min, "minutes")

	if (this.secsElmnt.innerHTML != sec) {
		this.secsElmnt.innerHTML = sec;
		this.updates.seconds = now;
	}

	this.renderBinary(this.secsBin, sec, "seconds")
}

render.now = render.getTime();
render.time = render.now;

var fpsList = [0];
var fpsSum = 0;
var fpsIndex = 0;

render.getAverageFPS = function() {
	return Math.ceil(fpsSum/fpsList.length);
}

render.getFPS = function() {
	return Math.floor(1/this.delta);
}

render.think = function() {
	requestAnimFrame(render.think);

	if (this.initialized == false)
		return;

	// Frame time!
	render.now = render.getTime();
	render.delta = render.now - render.time;
	render.time = render.now;

	countdown.draw(render.now);
	countdown.checkOnline(render.now);

	render.update(render.delta);
	render.draw(render.ctx);

	// Only calculate average FPS if debugging is enabled..
	if (settings.DEBUG) {
		var fps = render.getFPS();

		fpsSum -= fpsList[fpsIndex] || 0;
		fpsSum += fps;
		fpsList[fpsIndex] = fps;

		// Average of last X frames
		if (++fpsIndex == settings.DEBUG_FPS)
			fpsIndex = 0;
	}
}
render.think();

document.addEventListener("visibilitychange", function() {
	// Update the time when a user shows the hidden tab again
	// Prevents a large delta while resuming which can really mess up the particle physics
	if (!document.hidden)
		render.time = render.getTime();
})