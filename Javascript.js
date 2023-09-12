// Multiplayer:

// Suggestions:
// Cancelling healing
 
// To add:
// less movement speed when diagonal
// Non square player/enemy, rotating based on mouse angle


const firebaseConfig = {
	apiKey: "AIzaSyAG48CZGZb0KwGGA0s8lZKRG3xTDpOrL4Q",
	authDomain: "external-project-server.firebaseapp.com",
	databaseURL: "https://external-project-server-default-tdb.firebaseio.com",
	projectId: "external-project-server",
	storageBucket: "external-project-server.appspot.com",
	messagingSenderId: "536769510308",
	appId: "1:536769510308:web:dda587033dfd9d054b1f31"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
		

// PERSONAL VARIABLES
var Zones = [
	{Length: 15, Sizing: 2600, Dmg: 5}, 
	{Length: 25, Sizing: 1800, Dmg: 8}, 									
	{Length: 35, Sizing: 1600, Dmg: 12},
	{Length: 35, Sizing: 1200, Dmg: 15},
	{Length: 25, Sizing: 900, Dmg: 20}, 
	{Length: 15, Sizing: 0, Dmg: 25},   
];
var Inventory = ["", "", "", ""]
var ItemList = [
	{Type: "Umbrella", Duration: 3500},
	{Type: "Smoke", Duration: 6000},
	{Type: "Speed", Duration: 4000},
];
var HealerList = [
	{Type: "Coat", ShieldHeal: 25, Heal: 0, Duration: 2500},
	{Type: "Towel", ShieldHeal: 0, Heal: 50, Duration: 4000},
	{Type: "Dryer", ShieldHeal: 50, Heal: 60, Duration: 10000},
]
var GearList = [
	{Type: "WaterPistol", FireDelay: 0.2, Range: 350, MinRange: 0, Dmg: 8},
	{Type: "WaterGun", FireDelay: 0.5, Range: 450, MinRange: 0, Dmg: 19},
	{Type: "WaterBalloon", FireDelay: 1.3, Range: 500, MinRange: 250, Dmg: 95},
]
var Keys = [];
var checking, zonerun, drawing, PlayerID, Speed = 5, HP = 100, Shield = 0, ElementNum, PlayerNum=1;
var InGame = false, InHeal = false, HeldImg='', Practice = false, CurrentSlot = -1;
var myX, myY, FireTime=0, HealTime=0;
var TheZone = {TopX: 0, TopY: 0, BottomX: 3000, BottomY: 3000, Time: Zones[0].Length, Shrink: 3000-Zones[0].Sizing, CurrentZone: 1}; // Same for everyone, so doesn't need to be in firebase


// MULTIPLAYER VARIABLES

// These will become Personal
var Placements = ["???", "???", "???", "???"];
var SpawnedImgs = [];
var FiredWater = []; // All water projectile locations, dmg, direction, target spot
var PlayerPos = [{X: 50, Y: 50}, {X: 2950, Y: 50}, {X: 50, Y: 2950}, {X: 2950, Y: 2950}];
var EnteredGame = false, PlayerCount=-1;

var WorldMap = document.getElementById("WorldMap");
var Minimap = WorldMap.getContext("2d");
Minimap.fillStyle = "lightgreen";
Minimap.fillRect(0, 0, WorldMap.width, WorldMap.height);
var ctx = World.getContext("2d");


// https://WtrWar.github.io/ImgName.png
var GameImgs = [];
var ImgNames = [];
for (let i = 0; i < GearList.length; i++) ImgNames.push(GearList[i].Type);
for (let i = 0; i < ItemList.length; i++) ImgNames.push(ItemList[i].Type);
for (let i = 0; i < HealerList.length; i++)	ImgNames.push(HealerList[i].Type);
ImgNames.push("Rock");
ImgNames.push("Bush");
var Playerimg = new Image();
Playerimg.src = "https://WtrWar.github.io/Orange.png";
var Enemyimg = new Image();
Enemyimg.src = "https://WtrWar.github.io/Red.png";
var Waterimg = new Image();
Waterimg.src = "https://WtrWar.github.io/Water.png";


// GAME LOAD FUNCTIONS
function GameGeneration() {
	for (var i = 0; i < 85; i++) // 20 Gear, 15 items, 20 Healers, 20 rocks, 10 bushes
	{
		if (i < 55)
		{
			if (i < 20) var TempList = GearList;
			if (i >= 20 & i < 35) var TempList = ItemList;
			if (i >= 35) var TempList = HealerList;
			var Rand = Math.round(Math.random()*(TempList.length-1));
		    var Selection = TempList[Rand].Type;
		}
		if (i >= 55 & i < 75) var Selection = "Rock";
		if (i >= 75) var Selection = "Bush";
		var Xcoord = (Math.ceil(Math.random()*28))*100;
		var Ycoord = (Math.ceil(Math.random()*28))*100;
		
		var Collision = true;
		while (Collision == true)
		{
			Collision = false;
			for (let j = 0; j < SpawnedImgs.length; j++)
			{
				if (Xcoord == SpawnedImgs[j].X & Ycoord == SpawnedImgs[j].Y)
				{
					Collision = true;
					Xcoord = (Math.ceil(Math.random()*29))*100;
					Ycoord = (Math.ceil(Math.random()*29))*100;
				}
			}
		}
		if (i < 55) var Data = {Type: Selection, X: Xcoord, Y: Ycoord, HW: 30};
		if (i >= 55) var Data = {Type: Selection, X: Xcoord, Y: Ycoord, HW: 90};
		SpawnedImgs.push(Data);
	}
}

function GameStart() {
	PlayerPos = [{X: 50, Y: 50}, {X: 2950, Y: 50}, {X: 50, Y: 2950}, {X: 2950, Y: 2950}];
	if (Practice == false) Read();
	if (EnteredGame == false & Practice == false)
	{
		PlayerCount++;
		PlayerID = `${Name.value}${PlayerCount}`;
		PlayerNum = PlayerCount;
		Update("PlayerData");
		EnteredGame = true;
	}
	LoadPlayer.textContent = `Loading, ${PlayerCount}/4 Players`;
	YourId.textContent = `ID: ${PlayerID}`;
	
	if (PlayerCount == 4 | Practice == true)
	{
		for (let i = 0; i < ImgNames.length; i++)
		{
			let TempImg = new Image();
			TempImg.src = `https://WtrWar.github.io/${ImgNames[i]}.png`;
			GameImgs.push(TempImg);
		}
		clearInterval(checking);
		if (PlayerID.at(-1) == '4' | Practice == true) GameGeneration();
		InGame = true;
		Load.classList.add("hide");
		Game.classList.remove("hide");
		Info.classList.remove("hide");
		zonerun = setInterval(ZoneSystem, 1000);
		drawing = setInterval(UpdateScreen, 28.5); // 35FPS (Saves on Firebase Reading, but still playable)
	}
}

// PERSONAL FUNCTIONS
function CollideCheck(X1, X2, Y1, Y2, Length1, Length2) {
	if (X1+Length1 > X2 & X1 < X2+Length2)
	{
		if (Y1+Length1 > Y2 & Y1 < Y2+Length2)
		{
			return true;
		}
	}
	return false;
}

function EmptyInventory() {
	let Slot = (event.target.id).at(-1);
	Inventory[Slot-1] = ""; // not working. CurrentSlot undefined.
	HeldImg = document.getElementById(`${event.target.id}`);
	HeldImg.src = "https://WtrWar.github.io/GearSquare.png";
}

function Fire() {
	for (let i = 0; i < GearList.length; i++)
	{
		if (GearList[i].Type == Inventory[CurrentSlot] & FireTime >= GearList[i].FireDelay)
		{
			FireTime = 0;
		    let Xdist = event.clientX - 8 - World.width/2;
			let Ydist = event.clientY - 8 - World.height/2;

			let Dist = Math.sqrt((Xdist*Xdist) + (Ydist*Ydist));// Dist formula
			if (Dist < GearList[i].MinRange | Dist > GearList[i].Range) return;
			// To standardize speed (by making water travel 10px per run), Dist/A = 10
			// Dist = 10A, Dist/10 = A
			// Then divide the Xgradient and Ygradient by A, to standardize dist per frame
			let Divisor = Dist/8; // Changing 4 will change the standard speed (lowering slows speed)
			let Xgradient = Xdist/Divisor;
			let Ygradient = Ydist/Divisor;

			var WaterInfo = 
				{Dmg: GearList[i].Dmg, X: PlayerPos[PlayerNum].X, Y: PlayerPos[PlayerNum].Y, TargetX: PlayerPos[PlayerNum].X+Xdist, TargetY: PlayerPos[PlayerNum].Y+Ydist, Xgrad: Xgradient, Ygrad: Ygradient, Num: PlayerNum};
			
			FiredWater.push(WaterInfo);
		}
	}	
 }
World.onmousedown = Fire;

function Heal() {
	HealTime = 0;
	InHeal = false;
	HP += HealerList[ElementNum].Heal;
	Shield += HealerList[ElementNum].ShieldHeal;
	if (HP > 100) HP = 100;
	if (Shield > 50) Shield = 50;
	HPbar.value = HP;
	Shieldbar.value = Shield;
}

function Moving() {	
	if (InGame == false | InHeal == true) return;
	 
	if (Keys[87] == true) PlayerPos[PlayerNum-1].Y -= Speed;
	if (Keys[83] == true) PlayerPos[PlayerNum-1].Y += Speed;
	if (Keys[65] == true) PlayerPos[PlayerNum-1].X -= Speed;
	if (Keys[68] == true) PlayerPos[PlayerNum-1].X += Speed;
	
	for (let i = 0; i < SpawnedImgs.length; i++)
	{
		if (ScreenCheck(SpawnedImgs[i].X, SpawnedImgs[i].Y, "NoDraw", 0) == true & SpawnedImgs[i].Type == "Rock")
		{
			let x = PlayerPos[PlayerNum-1].X, y = PlayerPos[PlayerNum-1].Y;
			if (CollideCheck(x, SpawnedImgs[i].X, y, SpawnedImgs[i].Y, 40, SpawnedImgs[i].HW) == true)
			{
				if (Keys[87] == true & y+40 >= SpawnedImgs[i].Y) 
				{
					PlayerPos[PlayerNum-1].X += Speed;
				}
				if (Keys[83] == true & y <= SpawnedImgs[i].Y+SpawnedImgs[i].HW)
				{
					PlayerPos[PlayerNum-1].Y -= Speed;
				}
				if (Keys[65] == true & x+40 >= SpawnedImgs[i].X)
				{
					PlayerPos[PlayerNum-1].X += Speed;
				}
				if (Keys[68] == true & x <= SpawnedImgs[i].X+SpawnedImgs[i].HW)
				{
					PlayerPos[PlayerNum-1].X -= Speed;
				}
			}
		}
	}
	if (PlayerPos[PlayerNum-1].X > 3000) PlayerPos[PlayerNum-1].X = 3000;
	if (PlayerPos[PlayerNum-1].X < 0) PlayerPos[PlayerNum-1].X = 0;
	if (PlayerPos[PlayerNum-1].Y > 3000) PlayerPos[PlayerNum-1].Y = 3000;
	if (PlayerPos[PlayerNum-1].Y < 0) PlayerPos[PlayerNum-1].Y = 0;
	Update("PlayerData");
}

function PickUp() {
	for (let i = 0; i < SpawnedImgs.length; i++)
	{
		if (SpawnedImgs[i].Type != "Bush" & SpawnedImgs[i].Type != "Rock")
		{
			if (ScreenCheck(SpawnedImgs[i].X, SpawnedImgs[i].Y, "NoDraw", 0))
			{
				if (CollideCheck(PlayerPos[PlayerNum-1].X, SpawnedImgs[i].X, PlayerPos[PlayerNum-1].Y, SpawnedImgs[i].Y, 40, 30) == true)
				{
					for (let j = 0; j < Inventory.length; j++)
					{
						if (Inventory[j] == "")
						{
							Inventory[j] = SpawnedImgs[i].Type;
							HeldImg = document.getElementById(`Held${j+1}`);
							let type = SpawnedImgs[i].Type;
							HeldImg.src = `https://WtrWar.github.io/${type}.png`;
							SpawnedImgs.splice(i, 1);
							return;
						}
					}
				}
			}
		}
	}
}

function Usage() {
	if (event.key == "o")
	{
		PickUp();
		return;
	}
	if (InHeal == true | InGame == false) return;
	if (event.key != '1' & event.key != '2' & event.key != '3' & event.key != '4') return;
	
	if (CurrentSlot == -1)
	{
		CurrentSlot = (event.key)-1;
		HeldImg = document.getElementById(`Held${CurrentSlot+1}`);
	}
	try {
		HeldImg = document.getElementById(`Held${CurrentSlot+1}`);
		HeldImg.classList.remove("Highlighted");
	}
	catch {}
	CurrentSlot = (event.key)-1;
	HeldImg = document.getElementById(`Held${CurrentSlot+1}`);
	for (let i = 0; i < GearList.length; i++)
	{
		if (Inventory[CurrentSlot] == GearList[i].Type)
		{
			HeldImg.classList.add("Highlighted");
		}
	}
	for (let i = 0; i < HealerList.length; i++)
	{
		if (Inventory[event.key-1] != HealerList[i].Type) continue;
		Inventory[event.key-1] = "";
		HeldImg.src = "https://WtrWar.github.io/GearSquare.png";
		InHeal = true;
		ElementNum = i;
		HealTime = HealerList[ElementNum].Duration/1000;
		HealInfo.textContent = `${HealTime}s`;
		setTimeout(Heal, HealerList[ElementNum].Duration);
	}
	// Items (Just use if statements and not a new function as each item is very different)
}
document.onkeypress = Usage;


// MULTIPLAYER FUNCTIONS
function MatchMake() {
	console.log(PlayerCount);
	if (Name.value.length < 3) alert("Player name too short");
	if (Name.value.length > 15) alert("Player name too long");
	if (PlayerCount >= 4) alert("The game is full. Try again later");
	if (Name.value.length < 3 | Name.value.length > 15 | PlayerCount >= 4) return;
	Menu.classList.add("hide");
	Load.classList.remove("hide");
	checking = setInterval(GameStart, 1000); // Check if there are enough players every 1s
}
EnterGame.onclick = MatchMake;

function UpdateScreen() {
	if (Practice == false) Read();
	if (HealTime > 0)
	{
	    HealInfo.textContent = `${Math.ceil(HealTime)}s`;
		HealTime -= (1/35);
	}
	if (HealTime <= 0) HealInfo.textContent = "";

	myX = PlayerPos[PlayerNum-1].X;
	myY = PlayerPos[PlayerNum-1].Y;
	 
	let topx = TheZone.TopX - myX + World.width/2;
	let topy = TheZone.TopY - myY + World.height/2;
	let bottomx = TheZone.BottomX - myX + World.width/2;
	let dist = bottomx-topx; // changing when player moves

	ctx.fillStyle = "blue";
	ctx.fillRect(0, 0, World.width, World.height);
	ctx.fillStyle = "lightgreen";
	ctx.fillRect(topx, topy, dist, dist);
	
	if (Practice == false)
	{
		for (let i = 1; i < PlayerPos.length+1; i++) // make Opponents appear (Be red)
		{	
			if (i == PlayerNum) continue;
			ScreenCheck(PlayerPos[i-1].X, PlayerPos[i-1].Y, Enemyimg, 40)
		}
	}
    ctx.drawImage(Playerimg, World.width/2, World.height/2, 40, 40);
	
	for (let i = 0; i < SpawnedImgs.length; i++) // Rocks, items etc
	{
		let x = SpawnedImgs[i].X;
		let y = SpawnedImgs[i].Y;
		for (let j = 0; j < GameImgs.length; j++)
		{
			if (SpawnedImgs[i].Type == ImgNames[j]) // ImgNames and GameImgs Parallel
			{
		        ScreenCheck(x, y, GameImgs[j], SpawnedImgs[i].HW);
			}
		}
	}
	for (let i = 0; i < GearList.length; i++)
	{
		if (Inventory[CurrentSlot] == GearList[i].Type & HeldImg != null)
		{
			ctx.setLineDash([8, 15]);
			ctx.beginPath();
			ctx.arc(World.width/2, World.height/2, GearList[i].Range, 0, 2*Math.PI);
			ctx.strokeStyle = "black";
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(World.width/2, World.height/2, GearList[i].MinRange, 0, 2*Math.PI);
			ctx.strokeStyle = "red";
			ctx.stroke();
		}
	}
	FireTime += (1/60);	
	for (let i = 0; i < FiredWater.length; i++) // Make fired waters appear
	{
		ScreenCheck(FiredWater[i].X, FiredWater[i].Y, Waterimg, 30);
		FiredWater[i].X = FiredWater[i].X + FiredWater[i].Xgrad;
		FiredWater[i].Y = FiredWater[i].Y + FiredWater[i].Ygrad;
		if (FiredWater[i].Num != PlayerNum)
		{
			if (CollideCheck(PlayerPos[PlayerNum].X, FiredWater[i].X, PlayerPos[PlayerNum].Y, FiredWater[i].Y, 40, 30) == true)
			{
				Shield -= FiredWater[i].Dmg;
				if (Shield < 0)
				{
					HP -= (Shield*-1);
					Shield = 0;
				}
				if (HP <= 0) GameEnded();
			}
		}
		for (let j = 0; j < SpawnedImgs.length; j++)
		{
			if (SpawnedImgs[j].Type == "Rock")
	        {
			    if (CollideCheck(FiredWater[i].X, SpawnedImgs[j].X, FiredWater[i].Y, SpawnedImgs[j].Y, 30, 90) == true)
				{
					FiredWater.splice(i, 1);
				}
			}
		}					
		if (CollideCheck(FiredWater[i].X, FiredWater[i].TargetX, FiredWater[i].Y, FiredWater[i].TargetY, 5, 5) == true)
		{
			FiredWater.splice(i, 1);
			continue;
		}
	}
	Players.textContent = `${PlayerCount} players`;
} 

function ZoneSystem() {	
	TheZone.Time -= 1;
	let CurrentZone = TheZone.CurrentZone;
	let SizeChange;
	try {SizeChange = Zones[CurrentZone-2].Sizing - Zones[CurrentZone-1].Sizing;}
	catch {SizeChange = 3000 - Zones[0].Sizing;}
	TheZone.Shrink = Math.ceil(SizeChange/Zones[CurrentZone-1].Length);
	
	TheZone.TopX += TheZone.Shrink/2;
	TheZone.TopY += TheZone.Shrink/2;
	TheZone.BottomX -= TheZone.Shrink/2;
	TheZone.BottomY -= TheZone.Shrink/2;
	
	TimeLeft.textContent = `Closing time left: ${TheZone.Time}s`;
	// Changing the World from 3000 -> 200 (15 times smaller)
	let left = (TheZone.TopX)/15;
	let ZoneSize = (TheZone.BottomX-TheZone.TopX)/15;
	Minimap.fillStyle = "blue";
	Minimap.fillRect(0, 0, 200, 200);
	Minimap.fillStyle = "lightgreen";
	Minimap.fillRect(left, left, ZoneSize, ZoneSize);
	Minimap.fillStyle = "black";
	Minimap.fillRect((PlayerPos[PlayerNum-1].X)/15, PlayerPos[PlayerNum-1].Y/15, 40/15, 40/15);
	
	if (CollideCheck(PlayerPos[PlayerNum-1].X, TheZone.TopX, PlayerPos[PlayerNum-1].Y, TheZone.TopY, 40, TheZone.BottomX-TheZone.TopX) == false)
	{
	    HP -= Zones[CurrentZone-1].Dmg;
		HPbar.value = HP;
		if (HP <= 0) GameEnded();
	}
	if (TheZone.Time == 0)
	{
	    if (CurrentZone == Zones.length)
		{
			TheZone.TopX = 4000;
		    TheZone.TopY = 4000;
			TheZone.BottomX = 4000;
			TheZone.BottomY = 4000;
		}
		if (CurrentZone < Zones.length)
		{
			ZoneDisplay.textContent = `Closing zone: ${CurrentZone += 1}`;
			TheZone.CurrentZone += 1;
			TheZone.Time = Zones[CurrentZone-1].Length;
		}
    }
} 

function Read() {
	db.collection('Game').get().then((snapshot) => {
		snapshot.docs.forEach(doc => {
            if (doc.id == "GameData")
			{
				PlayerPos = [];
				let Objects = (doc.data().PlayerData).split('/');
				// Each obj in Objects is a player data in csv form
				for (let i = 0; i < 4; i++)
				{
					let Obj = Objects[i].split(',');
					let x = parseInt(Obj[0]);
					let y = parseInt(Obj[1]);
					PlayerPos.push({X: x, Y: y})
				}
				PlayerCount = doc.data().PlayerCount;
			}
		})
	})
}

function Update(DataType) {
    if (DataType == 'PlayerData')
	{
		let CsvString = "";
		for (let i = 0; i < 4; i++) // Return to csv layout
		{
			let x = PlayerPos[i].X;
			let y = PlayerPos[i].Y;
			if (i < 3) CsvString = CsvString+`${x},${y}/`;
			if (i == 3) CsvString = CsvString+`${x},${y}`;
		}
		db.collection('Game').doc('GameData').update({
			"PlayerData": CsvString,
			"PlayerCount": PlayerCount,
		})
	}
	if (DataType == 'SpawnedImgs')
	{
		db.collection('Game').doc('GameData').update({
	    	//Update x, y, type. use object array format.
	    })
	}		
}


// OTHER FUNCTIONS
function ControlsScreen() {alert("Press 1/2/3/4 for changing in inventory. WASD for moving. Click when holding a gear and within the black circle, but outside the red circle (if visible) to fire")}
Controls.onclick = ControlsScreen;

function GameEnded() { // Needs improving to work for when player leaves
	if (Practice == false)
	{
		PlayerCount--;
		Placements[PlayerCount] = PlayerID;
		if (PlayerCount == 0 & InGame == true) 
		{
			PlayerPos = [{X: 50, Y: 50}, {X: 2950, Y: 50}, {X: 50, Y: 2950}, {X: 2950, Y: 2950}];
			Update("PlayerData");
			alert("You won");
		}
		else alert("You lost");
		alert(`PLACEMENTS\n\n1st: ${Placements[0]}\n2nd: ${Placements[1]}\n3rd: ${Placements[2]}\n4th: ${Placements[3]}`);
	}
	if (Practice == true) alert("You were eliminated");
	clearInterval(zonerun);
	location.reload();
}

function RemovePlayer() {
	if (Practice == false)
	{
		PlayerCount--; // Using with >1 dreamweaver test in google causes matchmake issue
		
		Placements[PlayerCount] = PlayerID;
		
		PlayerPos[PlayerNum-1].X = 2950;
		if (PlayerNum == 1 | PlayerNum == 3) PlayerPos[PlayerNum-1].X = 50;
		
		PlayerPos[PlayerNum-1].Y = 2950;
		if (PlayerNum < 3) PlayerPos[PlayerNum-1].Y = 50;
		Update("PlayerData");
	}
}
window.onbeforeunload = RemovePlayer; // won't run. and won't for refreshes

function HowToPlay() {
	alert("Begin a match to be paired against 4 opponents. Click on a nearby gear, item, or healer to pick it up. Click to fire in that direction to eliminate opponents. The starting size is 3000px");
	for (let i = 0; i < Zones.length; i++) // Made to be dynamic if adjustments to zones made
	{
		alert(`Zone ${i+1}: Shrinks to ${Zones[i].Sizing}px, taking ${Zones[i].Length}s to close. Deals ${Zones[i].Dmg}dmg per second`);
	}
}
HTP.onclick = HowToPlay;

function KeyDown() {
    Keys = (Keys || []);             // Copied.       https://www.w3schools.com/graphics/game_controllers.asp
    Keys[event.keyCode] = true;          // Copied
	Moving();              
	Usage();
}
document.onkeydown = KeyDown;

function KeyUp() {Keys[event.keyCode] = false;}
document.onkeyup = KeyUp;

function ScreenCheck(x, y, Name, size) {
	let xCoord = x - myX + World.width/2;
	let yCoord = y - myY + World.height/2;
	if (xCoord >= -(World.width) & xCoord <= World.width & yCoord >= -(World.height) & yCoord <= World.height)
	{
		if (Name != "NoDraw")
		{
			ctx.drawImage(Name, xCoord, yCoord, size, size);
		}
		return true;
	}
	return false;
}

function StartPractice() {
		Practice = true;
		PlayerCount = 1;
		Menu.classList.add("hide");
		PlayerID = 'Player1';
		GameStart();
}
EnterPractice.onclick = StartPractice;

Read();