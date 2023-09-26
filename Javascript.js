// Multiplayer:
// CsvString removes Player1 name from data when matchmaking (May be fixed)
// Locations and In not being reset upon death (May be fixed)
// Water was being updated, but location not often (When In=false may stop you from updating your position?)
// Account sign up improvement

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
	{Length: 15, Sizing: 2600, Dmg: 0}, 
	{Length: 25, Sizing: 1800, Dmg: 0}, 									
	{Length: 35, Sizing: 1600, Dmg: 0},
	{Length: 35, Sizing: 1200, Dmg: 0},
	{Length: 25, Sizing: 900, Dmg: 0}, 
	{Length: 15, Sizing: 0, Dmg: 0},   
];
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
// The above objects can be easily adjusted or have a new item added by providing an image, and adding new object

var Inventory = ["", "", "", ""];
var Keys = [];
var KeyBinds = [119, 97, 100, 115, "f", "1", "2", "3", "4"];
var ChangingKeys = ["Move Up", "Move Left", "Move Right", "Move Down", "Pick Up", "Use Slot 1", "Use Slot 2", "Use Slot 3", "Use Slot 4", 0];
var checking, zonerun, drawing, PlayerID, Speed = 5, HP = 100, Shield = 0, ElementNum, PlayerNum=1;
var InGame = false, InHeal = false, HeldImg='', CurrentSlot = -1;
var myX, myY, FireTime=0, HealTime=0;
var TheZone = {TopX: 0, TopY: 0, BottomX: 3000, BottomY: 3000, Time: Zones[0].Length, Shrink: 3000-Zones[0].Sizing, CurrentZone: 1}; // Same for everyone, so doesn't need to be in firebase
var MultiplayerDelay = 0;

var GameImgs = [];
var ImgNames = ["Orange", "Red", "Water", "Eliminated", "Rock", "Bush"];
for (let i = 0; i < GearList.length; i++) ImgNames.push(GearList[i].Type);
for (let i = 0; i < ItemList.length; i++) ImgNames.push(ItemList[i].Type);
for (let i = 0; i < HealerList.length; i++)	ImgNames.push(HealerList[i].Type);

var Minimap = WorldMap.getContext("2d");
var ctx = World.getContext("2d");

// MULTIPLAYER/WORLD VARIABLES
var SpawnedImgs = [], FiredWater = [], PlayerPos = [{X: 50, Y: 50, In: "true", Name: ""}, {X: 2950, Y: 50, In: "true", Name: ""}, {X: 50, Y: 2950, In: "true", Name: ""}, {X: 2950, Y: 2950, In: "true", Name: ""}];;
var EnteredGame = false, PlayerCount = 1, Practice = false, GameLoaded = false, MyName="";


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
		
		let Collision = true;
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
		if (i < 55) SpawnedImgs.push({Type: Selection, X: Xcoord, Y: Ycoord, HW: 30});
		if (i >= 55) SpawnedImgs.push({Type: Selection, X: Xcoord, Y: Ycoord, HW: 90});
	}
	Update("SpawnedImgs");
}

function GameStart() {
	if (Practice == true) PlayerPos = [{X: 50, Y: 50, In: "true", Name: ""}, {X: 2950, Y: 50, In: "true", Name: ""}, {X: 50, Y: 2950, In: "true", Name: ""}, {X: 2950, Y: 2950, In: "true", Name: ""}];
	if (Practice == false) Read();
	if (GameLoaded == true & EnteredGame == false | PlayerCount == 4 & EnteredGame == false)
	{
		clearInterval(checking);
		alert("Game already started. Try again later.");
		return;
	}
	Menu.classList.add("hide");
	Load.classList.remove("hide");
	if (EnteredGame == false & Practice == false)
	{
		PlayerPos[PlayerCount].Name = MyName;
		PlayerCount++;
		PlayerID = `${MyName}${PlayerCount}`;
		PlayerNum = PlayerCount;
		Update("PlayerData");
		EnteredGame = true;
	}
	LoadPlayer.textContent = `Loading, ${PlayerCount}/4 Players`;
	YourId.textContent = `ID: ${PlayerID}`;
	
	if (PlayerCount == 4 | Practice == true)
	{		
		clearInterval(checking);
		for (let i = 0; i < ImgNames.length; i++)
		{
			let TempImg = new Image();
			TempImg.src = `https://WtrWar.github.io/${ImgNames[i]}.png`;
			GameImgs.push(TempImg);
		}
		if (PlayerNum == 4 | Practice == true) 
	    {
			SpawnedImgs = [];
			GameGeneration();
			if (Practice == false) // adapts if a player leaves
			{
				PlayerPos[0].X = 50;
				PlayerPos[0].Y = 50;
				PlayerPos[0].In = "true";
				PlayerPos[1].X = 2950;
				PlayerPos[1].Y = 50;
				PlayerPos[1].In = "true";
				PlayerPos[2].X = 50;
				PlayerPos[2].Y = 2950;
				PlayerPos[2].In = "true";
				PlayerPos[3].X = 2950;
				PlayerPos[3].Y = 2950;
				PlayerPos[3].In = "true";
				GameLoaded = true;
				Update("PlayerData");
				Update("SpawnedImgs");
				FiredWater = [];//[{Dmg: 0, X:-1000, Y:-1000, TargetX: 0, TargetY: 0, Xgrad: 0, Ygrad: 0, Num: 1}]; // Dummy data so the Update function will run. Will not impact the game and only appears for first frame
				Update("FiredWater");
			}
		}
		InGame = true;
		Load.classList.add("hide");
		Game.classList.remove("hide");
		Info.classList.remove("hide");
		zonerun = setInterval(ZoneSystem, 1000);
		drawing = setInterval(UpdateScreen, 25); // 40FPS (Saves on Firebase Reading, but still playable)
	}
}


// PERSONAL FUNCTIONS
function EmptyInventory() {
	let Slot = (event.target.id).at(-1);
	Inventory[Slot-1] = ""; // not working. CurrentSlot undefined.
	HeldImg = document.getElementById(`${event.target.id}`);
	HeldImg.src = "https://WtrWar.github.io/GearSquare.png";
}

function Fire() {
	for (let i = 0; i < GearList.length; i++)
	{
		if (GearList[i].Type == Inventory[CurrentSlot-1] & FireTime >= GearList[i].FireDelay)
		{
			FireTime = 0;
		    let Xdist = event.clientX - 8 - World.width/2;
			let Ydist = event.clientY - 8 - World.height/2;
			// 8 is taken away as (8, 8) is the (0, 0) position in World
			
			let Dist = Math.sqrt((Xdist*Xdist) + (Ydist*Ydist));// Dist formula
			if (Dist < GearList[i].MinRange | Dist > GearList[i].Range) return;
			// To standardize speed (by making water travel 10px per run), Dist/A = 10, Dist = 10A, Dist/10 = A
			// Then divide the Xgradient and Ygradient by A, to standardize dist per frame
			let Divisor = Dist/8; // Changing 8 will change the standard speed (lowering reduces speed)
			let Xgradient = Xdist/Divisor;
			let Ygradient = Ydist/Divisor;

			var WaterInfo = 
				{Dmg: GearList[i].Dmg, X: PlayerPos[PlayerNum-1].X, Y: PlayerPos[PlayerNum-1].Y, TargetX: PlayerPos[PlayerNum-1].X+Xdist, TargetY: PlayerPos[PlayerNum-1].Y+Ydist, Xgrad: Xgradient, Ygrad: Ygradient, Num: PlayerNum};
			
			// Num in WaterInfo is used to make sure player doesn't get damaged by their water, and allows spectating eliminator
			FiredWater.push(WaterInfo);
			if (Practice == false) Update("FiredWater");
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
	let upkey = KeyBinds[0];
	let leftkey = KeyBinds[1];
	let rightkey = KeyBinds[2];
	let downkey = KeyBinds[3];
	
	if (Keys[upkey] == true) PlayerPos[PlayerNum-1].Y -= Speed;
	if (Keys[downkey] == true) PlayerPos[PlayerNum-1].Y += Speed;
	if (Keys[leftkey] == true) PlayerPos[PlayerNum-1].X -= Speed;
	if (Keys[rightkey] == true) PlayerPos[PlayerNum-1].X += Speed;
	
	for (let i = 0; i < SpawnedImgs.length; i++)
	{
		if (ScreenCheck(SpawnedImgs[i].X, SpawnedImgs[i].Y, "NoDraw", 0) == true & SpawnedImgs[i].Type == "Rock")
		{
			let x = PlayerPos[PlayerNum-1].X, y = PlayerPos[PlayerNum-1].Y;
			if (CollideCheck(x, SpawnedImgs[i].X, y, SpawnedImgs[i].Y, 40, SpawnedImgs[i].HW) == true)
			{
				if (Keys[downkey] == true & y+40 >= SpawnedImgs[i].Y) 
				{
					PlayerPos[PlayerNum-1].Y -= Speed;
				}
				if (Keys[upkey] == true & y <= SpawnedImgs[i].Y+SpawnedImgs[i].HW)
				{
					PlayerPos[PlayerNum-1].Y += Speed;
				}
				if (Keys[rightkey] == true & x+40 >= SpawnedImgs[i].X)
				{
					PlayerPos[PlayerNum-1].X -= Speed;
				}
				if (Keys[leftkey] == true & x <= SpawnedImgs[i].X+SpawnedImgs[i].HW)
				{
					PlayerPos[PlayerNum-1].X += Speed;
				}
			}
		}
	}
	if (PlayerPos[PlayerNum-1].X > 3000) PlayerPos[PlayerNum-1].X = 3000;
	if (PlayerPos[PlayerNum-1].X < 0) PlayerPos[PlayerNum-1].X = 0;
	if (PlayerPos[PlayerNum-1].Y > 3000) PlayerPos[PlayerNum-1].Y = 3000;
	if (PlayerPos[PlayerNum-1].Y < 0) PlayerPos[PlayerNum-1].Y = 0;
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
							if (Practice == false) Update("SpawnedImgs"); // remove img from game
							return;
						}
					}
				}
			}
		}
	}
}

function Usage() {
	if (event.key == KeyBinds[4])
	{
		PickUp();
		return;
	}
	if (InHeal == true | InGame == false) return;
	if (event.key != KeyBinds[5] & event.key != KeyBinds[6] & event.key != KeyBinds[7] & event.key != KeyBinds[8]) return;
	
	let SelectionKeys = [KeyBinds[5], KeyBinds[6], KeyBinds[7], KeyBinds[8]];
	for (let i = 0; i < SelectionKeys.length; i++)
	{
		if (SelectionKeys[i] != event.key) continue;
		if (CurrentSlot == -1)
		{
			CurrentSlot = i+1;
			HeldImg = document.getElementById(`Held${CurrentSlot}`);
		}
		try {
			HeldImg = document.getElementById(`Held${CurrentSlot}`);
			HeldImg.classList.remove("Highlighted");
		}
		catch {}
		CurrentSlot = i+1;
	}
	HeldImg = document.getElementById("Held" + CurrentSlot);
	for (let i = 0; i < GearList.length; i++)
	{
		if (Inventory[CurrentSlot-1] == GearList[i].Type)
		{
			HeldImg.classList.add("Highlighted");
		}
	}
	for (let i = 0; i < HealerList.length; i++)
	{
		if (Inventory[CurrentSlot-1] != HealerList[i].Type) continue;
		Inventory[CurrentSlot-1] = "";
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
	if (MyName == "") 
	{
		alert("Create or sign into an account to play Multiplayer");
		return;
	}
	checking = setInterval(GameStart, 1000); // Check if there are enough players every 1s
}
EnterGame.onclick = MatchMake;

function UpdateScreen() {
	if (Practice == false) 
	{
		MultiplayerDelay++;
		if (MultiplayerDelay%4 == 0) 
		{
			Update("PlayerData"); // Reduce the running from Moving()
			Read(); 
		}
	}
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
			if (PlayerPos[i-1].In == "false") ScreenCheck(PlayerPos[i-1].X, PlayerPos[i-1].Y, GameImgs[3], 40);
			if (PlayerPos[i-1].In == "true") ScreenCheck(PlayerPos[i-1].X, PlayerPos[i-1].Y, GameImgs[1], 40)
		}
	}
	if (PlayerPos[PlayerNum-1].In == "false") ctx.drawImage(GameImgs[3], World.width/2, World.height/2, 40, 40);
	if (PlayerPos[PlayerNum-1].In == "true") ctx.drawImage(GameImgs[0], World.width/2, World.height/2, 40, 40);

	for (let i = 0; i < SpawnedImgs.length; i++) // Rocks, items etc
	{
		let x = SpawnedImgs[i].X;
		let y = SpawnedImgs[i].Y;
		for (let j = 0; j < GameImgs.length; j++)
		{
			if (SpawnedImgs[i].Type == ImgNames[j]) // ImgNames and GameImgs Parallel
			{
				ScreenCheck(SpawnedImgs[i].X, SpawnedImgs[i].Y, GameImgs[j], SpawnedImgs[i].HW);
			}
		}
	}

	for (let i = 0; i < GearList.length; i++)
	{
		if (Inventory[CurrentSlot-1] == GearList[i].Type & HeldImg != null)
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
	console.log("Length: " + FiredWater.length);
	for (let i = 0; i < FiredWater.length; i++) // Make fired waters appear. Not read by PlayerNum != PlayerCount
	{
		if (PlayerNum == PlayerCount)
		{
			FiredWater[i].X = FiredWater[i].X + FiredWater[i].Xgrad;
			FiredWater[i].Y = FiredWater[i].Y + FiredWater[i].Ygrad;
		}
		if (FiredWater[i].Num != PlayerNum)
		{
			if (CollideCheck(PlayerPos[PlayerNum-1].X, FiredWater[i].X, PlayerPos[PlayerNum-1].Y, FiredWater[i].Y, 40, 30) == true & InGame == true)
			{
				Shield -= FiredWater[i].Dmg;
				if (Shield < 0)
				{
					HP += Shield; // If Shield became -30, now HP loses 30, Shield is now 0
					Shield = 0;
				}
				if (HP <= 0) 
				{ 
					PlayerPos[PlayerNum-1].In = "false";
					SpectateName.textContent = `Spectating: ${PlayerPos[num-1].Name}`;
					PlayerNum = FiredWater[i].Num; // Spectate the eliminator
					GameEnded();
				}
				FiredWater.splice(i, 1);
				if (Practice == false) Update("FiredWater");
			}
		}

		if (PlayerNum == PlayerCount)
		{
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
			}
		}
		ScreenCheck(FiredWater[i].X, FiredWater[i].Y, GameImgs[2], 30);
		if (PlayerNum == PlayerCount & Practice == false) Update("FiredWater");
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
		if (HP <= 0 & InGame == true) 
		{
			PlayerPos[PlayerNum-1].In = "false";
			// Grab random number 1-4, and check if same as PlayerNum. If not, PlayerNum = RandomNumber, if so, repeat again. (spectating a random player)
			GameEnded();
		}
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
			let str = "";
			
			GameLoaded = doc.data().Began;
			if (PlayerCount > doc.data().PlayerCount & GameLoaded == false & PlayerNum > PlayerCount) // Player left matchmaking, and: Eg Player1 left so Player3 now Player2. Player2 now Player1.
			{
				PlayerNum--;
				PlayerID = `${MyName}${PlayerNum}`;
			}

			let mine = {X: PlayerPos[PlayerNum-1].X, Y: PlayerPos[PlayerNum-1].Y, In: PlayerPos[PlayerNum-1].In, Name: PlayerPos[PlayerNum-1].Name};
			PlayerPos = [];
			str = doc.data().PlayerData;
			let Objects = str.split('/'); // Each obj is player data in csv form 
			for (let i = 0; i < Objects.length; i++)
			{
				if (i == PlayerNum-1) // Making player location update less frequent than other reading causes the position to be incorrect. By saving the position this issue does not occur and saves reading/update amount
				{
					PlayerPos.push({X: mine.X, Y: mine.Y, In: mine.In, Name: mine.Name});
					continue;
				}
				let Obj = Objects[i].split(',');
				PlayerPos.push({X: parseInt(Obj[0]), Y: parseInt(Obj[1]), In: Obj[2], Name: Obj[3]});
			}		
			PlayerCount = doc.data().PlayerCount;
			
			SpawnedImgs = [];
			str = doc.data().SpawnedImgs;
			Objects = str.split('/');
			for (let i = 0; i < Objects.length; i++)
			{
				if (Objects[i] == null) continue;
				let Obj = Objects[i].split(',');
				SpawnedImgs.push({Type: Obj[0], X: parseInt(Obj[1]), Y: parseInt(Obj[2]), HW: parseInt(Obj[3])});
			}

			FiredWater = [];
			str = doc.data().FiredWater;
			Objects = str.split('/');
            if (str == "") return;
			for (let i = 0; i < Objects.length; i++)
			{
				let Obj = Objects[i].split(',');
				FiredWater.push({Dmg: parseInt(Obj[0]), X: parseInt(Obj[1]), Y: parseInt(Obj[2]), TargetX: parseInt(Obj[3]), TargetY: parseInt(Obj[4]), Xgrad: parseInt(Obj[5]), Ygrad: parseInt(Obj[6]), Num: parseInt(Obj[7])});
			}
		})
	})
}

function Update(DataType) {
	let CsvString = "";
    if (DataType == 'PlayerData')
	{
		for (let i = 0; i < PlayerPos.length; i++) // Return to csv layout
		{
			CsvString = CsvString+`${PlayerPos[i].X},${PlayerPos[i].Y},${PlayerPos[i].In},${PlayerPos[i].Name}/`;
		}
		CsvString = CsvString.slice(0, -1);
		db.collection('Game').doc('GameData').update({
			"PlayerData": CsvString,
			"PlayerCount": PlayerCount,
			"Began": GameLoaded,
		})
	}
	if (DataType == 'SpawnedImgs')
    {
		for (let i = 0; i < SpawnedImgs.length; i++)
		{
			CsvString = CsvString +`${SpawnedImgs[i].Type},${SpawnedImgs[i].X},${SpawnedImgs[i].Y},${SpawnedImgs[i].HW}/`;
		}
		CsvString = CsvString.slice(0, -1);
		db.collection('Game').doc('GameData').update({
	    	"SpawnedImgs": CsvString,
	    })
	}		
	if (DataType == "FiredWater")
	{
		for (let i = 0; i < FiredWater.length; i++)
		{
			CsvString = CsvString+`${FiredWater[i].Dmg},${FiredWater[i].X},${FiredWater[i].Y},${FiredWater[i].TargetX},${FiredWater[i].TargetY},${FiredWater[i].Xgrad},${FiredWater[i].Ygrad},${FiredWater[i].Num}/`;
		}
		
		CsvString = CsvString.slice(0, -1);
		db.collection('Game').doc('GameData').update({
			"FiredWater": CsvString,
		})
	}
}

	
// Menu Options
function ShowControls() {alert("Press 1/2/3/4 to use inventory, WASD to move, and F to pick up. The controls will be different if changed in settings")}
Controls.onclick = ShowControls;
	
function HowToPlay() {
	alert("Begin a match to be paired against 4 opponents. Click on a nearby gear, item, or healer to pick it up. Click when holding a gear and within the black circle, but outside the red circle (if visible) to fire to eliminate opponents. The starting size is 3000px.");
	for (let i = 0; i < Zones.length; i++) // Made to be dynamic if adjustments to zones made
	{
		alert(`Zone ${i+1}: Shrinks to ${Zones[i].Sizing}px, taking ${Zones[i].Length}s to close. Deals ${Zones[i].Dmg}dmg per second.`);
	}
}
HTP.onclick = HowToPlay;
	
function StartPractice() {
	Practice = true;
	PlayerCount = 1;
	Menu.classList.add("hide");
	PlayerID = 'Player1';
	GameStart();
}
EnterPractice.onclick = StartPractice;
	
function ChangeScreen() {
	if (window.event.target.id == "Back") // Exiting to Menu
	{
		Menu.classList.remove("hide");
		if (SettingScreen.classList.contains("hide") == false) // Currently in Settings
		{
            SettingScreen.classList.add("hide");
		}
		if (AccountScreen.classList.contains("hide") == false) // Currently in Accounts
		{
			AccountScreen.classList.add("hide");
			
			// Dummy acc (temp)
			MyName = "TempAcc";
			EnterGame.textContent = "Multiplayer";
		}
		Back.classList.add("hide"); // Remove Back button
		return;
	}	
	Back.classList.remove("hide"); 
	Menu.classList.add("hide");
	if (window.event.target.id == "Settings") // Enter settings
	{
		SettingScreen.classList.remove("hide");
	}
	if (window.event.target.id == "Accounts") // Enter accounts
	{
		AccountScreen.classList.remove("hide");
	}
}
Settings.onclick = ChangeScreen;
Back.onclick = ChangeScreen;
Accounts.onclick = ChangeScreen;
	
function SignUpOrIn() {	
	if (window.event.target.id == "SignIn")
	{
		let User = Name.value;
		let Password = Pass.value;
	}
	if (window.event.target.id == "SignUp")
	{
		let User = NameMake.value;
		let Password = PassMake.value;
	}
	db.collection('Game').get().then((snapshot) => {
		snapshot.docs.forEach(doc => {
			if (doc.id == User)
			{
				if (window.event.target.id == "SignIn")
				{
					setTimeout(function() {
						let Obj = doc.data().split(',');
						if (Obj[0] == Password)
						{
							myName = doc.id;
							alert("Successful sign in");
							return;
						}
				    })
				}
				if (window.event.target.id == "SignUp")
				{
					alert("Account exists already");
					return;
				}
			}
		})
	})
	// Add account
	myName = User;
	alert("Account made");
}
SignIn.onclick = SignUpOrIn;
SignUp.onclick = SignUpOrIn;
	
function ChangeBinds() {
	let char = NewKey.value;
	char = char.toLowerCase();
	char = char.trim();
	if (char == "" & char.length != 1) return;
	if (ChangingKeys[9] == 0) 
	{
		Back.classList.add("hide");
		KeyBinds = ['', '', '', '', '', '', '', '', '']; // To track if keybinds are repeated
		ChangingKeys[9] = 0;
	}
	let num = ChangingKeys[9];
	for (let i = 0; i < KeyBinds.length-1; i++)
	{
		if (char == KeyBinds[i] | char.charCodeAt(0) == KeyBinds[i]) // Already binded
	     {
			alert("Already a used key");
			return;
		}
	}
	KeyBinds[num] = char;
	if (num < 4) // Binds for moving. Need to be in KeyCode for diagonal movement
	{
		KeyBinds[num] = char.charCodeAt(0); // converts to UniCode/Ascii or something like that. not the keycode though.
	}
	ChangingKeys[9] = num += 1;
	KeyToChange.textContent = "Press " + ChangingKeys[num]; // First will access element 1, then element 2...
	NewKey.value = "";
	if (num == 9) // Accessing the number and not a bind
	{
		ChangingKeys[9] = 0;
		KeyToChange.textContent = "Press " + ChangingKeys[0];
		Back.classList.remove("hide");
	}
}
change.onclick = ChangeBinds;
	
	
// OTHER FUNCTIONS
function GameEnded() {
	if (Practice == false & InGame == true)
	{
		if (PlayerCount == 1) Placement.textContent = "You placed: 1st";
		if (PlayerCount == 2) Placement.textContent = "You placed: 2nd";
		if (PlayerCount == 3) Placement.textContent = "You placed: 3rd";
		if (PlayerCount >= 4) Placement.textContent = `You placed: ${PlayerCount}th`;
	    Info.classList.add("hide");
		PlayerPos[PlayerNum-1].In = "false";
		InGame = false;
		PlayerCount--;
		if (PlayerCount == 0 & InGame == true) 
		{
			PlayerPos = [{X: 50, Y: 50, In: "true", Name: "Name"}, {X: 2950, Y: 50, In: "true", Name: "Name"}, {X: 50, Y: 2950, In: "true", Name: "Name"}, {X: 2950, Y: 2950, In: "true", Name: "Name"}];
			GameLoaded = false;
			Update("PlayerData");
			FiredWater = [];
			Update("FiredWater");
		}
	}
	if (Practice == true) 
	{
		clearInterval(zonerun);
		alert("You were eliminated");
		location.reload();
	}
}

function RemovePlayer() {
	if (Practice == false)
	{
		PlayerCount--; // Using with >1 dreamweaver test in google causes matchmake issue
		// Add 1 to games played and adjust the average placement
		Update("PlayerData");
	}
}
window.onbeforeunload = RemovePlayer;

function KeyDown() {
    Keys = (Keys || []);             // Copied.       https://www.w3schools.com/graphics/game_controllers.asp
	
	let key = event.key;
    Keys[key.charCodeAt(0)] = true;       
	Moving();              
	Usage();
}
document.onkeydown = KeyDown;

function KeyUp() {
	let key = event.key;
	Keys[key.charCodeAt(0)] = false;  
}
document.onkeyup = KeyUp;

function ScreenCheck(x, y, Name, size) {
	let xCoord = x - myX + World.width/2;
	let yCoord = y - myY + World.height/2;
	if (xCoord >= -(World.width) & xCoord <= World.width & yCoord >= -(World.height) & yCoord <= World.height)
	{
		if (Name != "NoDraw") ctx.drawImage(Name, xCoord, yCoord, size, size);
		return true;
	}
	return false;
}
	
function CollideCheck(X1, X2, Y1, Y2, Length1, Length2) {
	if (X1+Length1 > X2 & X1 < X2+Length2) // Any point on the two images have same x
	{
		if (Y1+Length1 > Y2 & Y1 < Y2+Length2) // Point also had the same y (Collides)
		{
			return true;
		}
	}
	return false;
}

if (navigator.onLine == true) Read();
if (navigator.onLine == false) {
	EnterGame.classList.add("hide");
	Accounts.classList.add("hide");
	alert("You are not connected to the internet. To play Multiplayer, reconnect and reload page");
}