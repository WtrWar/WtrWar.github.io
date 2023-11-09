// Features list:

// Zone (Simple adjust/add), Firing & Display range (Simple adjust/add), Healing & Display time (Simple adjust/add), Movement, Pick up in-game items, Menu & Page system, Change keybinds, Spectating others, Account & Stat tracking, Multiplayer opponents


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
]
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
// The above object list can be easily adjusted or have a new item added by providing an image, and adding new object into the lust.

var Inventory = ["", "", "", ""];
var Keys = [];
var KeyBinds = [119, 97, 100, 115, "f", "1", "2", "3", "4"];
var ChangingKeys = ["Move Up", "Move Left", "Move Right", "Move Down", "Pick Up", "Use Slot 1", "Use Slot 2", "Use Slot 3", "Use Slot 4", 0];
var checking, zonerun, drawing, Speed = 5, HP = 100, Shield = 0, ElementNum, PlayerNum=1;
var InGame = false, InHeal = false, HeldImg='', CurrentSlot = -1;
var myX, myY, FireTime=0, HealTime=0;
var TheZone = {TopX: 0, TopY: 0, BottomX: 3000, BottomY: 3000, Time: Zones[0].Length, Shrink: 3000-Zones[0].Sizing, CurrentZone: 1}; // Same for everyone, so doesn't need to be in firebase
var MultiplayerDelay = 0;

// To contain the name of each image type in the game for fast access
var GameImgs = [];
var ImgNames = ["Orange", "Red", "Water", "Eliminated", "Rock", "Bush"];
for (let i = 0; i < GearList.length; i++) ImgNames.push(GearList[i].Type);
for (let i = 0; i < HealerList.length; i++)	ImgNames.push(HealerList[i].Type);

var Minimap = WorldMap.getContext("2d");
var ctx = World.getContext("2d");

// MULTIPLAYER/WORLD VARIABLES
var SpawnedImgs = [], FiredWater = [], PlayerPos = [{X: 50, Y: 50, In: "true", Name: ""}, {X: 2950, Y: 50, In: "true", Name: ""}, {X: 50, Y: 2950, In: "true", Name: ""}, {X: 2950, Y: 2950, In: "true", Name: ""}];
var EnteredGame = false, PlayerCount = 1, Practice = false, GameLoaded = false, MyData = {Name: ""};


// GAME LOAD FUNCTIONS
function GameGeneration() {
	for (var i = 0; i < 100; i++) // 25 Gear, 25 Healers, 30 rocks, 20 bushes
	{
		if (i < 50) // If placing a gear or healer
		{
			// Because for Gear and Healers, one is randomly chosen from multiple options in the list. To do this, a TempList is used to grab the object list
			if (i < 25) var TempList = GearList;
			if (i >= 25) var TempList = HealerList;
			// Then the length of the TempList is used to generate a random number, and this number will grab the information of the chosen element in TempList
			var Rand = Math.round(Math.random()*(TempList.length-1));
		    var Selection = TempList[Rand].Type;
		}
		if (i >= 50 & i < 80) var Selection = "Rock";
		if (i >= 80) var Selection = "Bush";
		// Generate a random location in the world. This is multiplied by 100 so there is a grid system to these images. Images can then sit at (0, 0) or (0, 100) or (0, 200) and this prevents images from overlapping
		var Xcoord = (Math.ceil(Math.random()*28))*100;
		var Ycoord = (Math.ceil(Math.random()*28))*100;
		
		let Collision = true;
		while (Collision == true)
		{
			Collision = false;
			for (let j = 0; j < SpawnedImgs.length; j++)
			{
				// Using the generated coordinates for the image, this is then checked against the currently existing images. If there is a collision, a new location is generated and the while loop repeats until there will be no overlap
				if (Xcoord == SpawnedImgs[j].X & Ycoord == SpawnedImgs[j].Y)
				{
					Collision = true;
					Xcoord = (Math.ceil(Math.random()*29))*100;
					Ycoord = (Math.ceil(Math.random()*29))*100;
				}
			}
		}
		// Add the information to SpawnedImgs array. HW contains the sizing of the image.
		if (i < 50) SpawnedImgs.push({Type: Selection, X: Xcoord, Y: Ycoord, HW: 30});
		if (i >= 50) SpawnedImgs.push({Type: Selection, X: Xcoord, Y: Ycoord, HW: 90});
	}
	if (Practice == false) Update("SpawnedImgs");
	// Update firebase so other players will see the world as well
}

function GameStart() {
	if (Practice == true) PlayerPos = [{X: 50, Y: 50, In: "true", Name: ""}, {X: 2950, Y: 50, In: "true", Name: ""}, {X: 50, Y: 2950, In: "true", Name: ""}, {X: 2950, Y: 2950, In: "true", Name: ""}];
	// Use the default information for positioning as the player is playing alone.
	
	if (Practice == false) Read(); // Read the number of players
	
	// If the game has already begun or there are no free places for the player to join
	if (GameLoaded == true & EnteredGame == false | PlayerCount == 4 & EnteredGame == false)
	{
		if (Practice == false)
		{
			clearInterval(checking);
			alert("Game already started. Try again later.");
			return;
		}
	}
	Menu.classList.add("hide");
	Load.classList.remove("hide");
	
	// If EnteredGame is false, the player is not waiting for more players before the game starts
	if (EnteredGame == false & Practice == false)
	{
		// The player's name is then added to the list
		PlayerPos[PlayerCount].Name = MyData.Name;
		PlayerCount++;
		PlayerNum = PlayerCount;
		// Increase the player count and update so other players can see that a player has joined
		Update("PlayerData");
		EnteredGame = true; // The player is in the queue and will be prevented from increasing the playercount incorrectly
	}
	LoadPlayer.textContent = `Loading, ${PlayerCount}/4 Players`;
	
	if (PlayerCount == 4 | Practice == true) // Enough players have joined or are playing alone
	{		
		clearInterval(checking); // Checking playercount for matchmaking stopped
		for (let i = 0; i < ImgNames.length; i++) 
		{
			let TempImg = new Image();
			TempImg.src = `https://WtrWar.github.io/${ImgNames[i]}.png`;
			GameImgs.push(TempImg);
			// Create a parallel array to ImgNames so the images are contained parralel to the name so these can be accessed quickly if the element of ImgNames is known when placing an image
		}
		if (PlayerNum == 4 | Practice == true) // The last player to join generates game
	    {
			SpawnedImgs = [];
			GameGeneration(); 
			if (Practice == false) Update("SpawnedImgs");
			GameLoaded = true;
			if (Practice == false) Update("PlayerData");
		}
		Load.classList.add("hide");
		Game.classList.remove("hide");
		Info.classList.remove("hide");
		zonerun = setInterval(ZoneSystem, 1000);
		drawing = setInterval(UpdateScreen, 25); // 40FPS (Saves on Firebase Reading, but still playable)
		InGame = true;
	}
}


// PERSONAL FUNCTIONS
function EmptyInventory() {
	let Slot = (event.target.id).at(-1);
	// When a player presses on an inventory square, this will grab the id of the image such as Slot1
	Inventory[Slot-1] = "";
	// Then clear the space in the inventory and show this was removed
	HeldImg = document.getElementById(`${event.target.id}`);
	HeldImg.src = "https://WtrWar.github.io/GearSquare.png";
}

function Fire() {
	// Run through all gear in the game
	for (let i = 0; i < GearList.length; i++)
	{
		// If the player is holding this gear and the delay between firing has been met
		if (GearList[i].Type == Inventory[CurrentSlot-1] & FireTime >= GearList[i].FireDelay)
		{
			FireTime = 0; // The player has just shot, and will have to wait the delay before firing again
		    let Xdist = event.clientX - 8 - World.width/2;
			let Ydist = event.clientY - 8 - World.height/2;
			// 8 is taken away as (8, 8) is the (0, 0) position in World
			
			let Dist = Math.sqrt((Xdist*Xdist) + (Ydist*Ydist));// Dist formula
			if (Dist < GearList[i].MinRange | Dist > GearList[i].Range) return;
			// To standardize speed (by making water travel 10px per run), Dist/Divisor = 10, Dist/10 = Divisor
			let Divisor = Dist/8; // Changing 8 will change the standard speed (lowering reduces speed)
			// Then divide the Xgradient and Ygradient by Divisor, to standardize dist per frame
			let Xgradient = Xdist/Divisor;
			let Ygradient = Ydist/Divisor;

			var WaterInfo = 
				{Dmg: GearList[i].Dmg, X: PlayerPos[PlayerNum-1].X, Y: PlayerPos[PlayerNum-1].Y, TargetX: PlayerPos[PlayerNum-1].X+Xdist, TargetY: PlayerPos[PlayerNum-1].Y+Ydist, Xgrad: Xgradient, Ygrad: Ygradient, Num: PlayerNum};
			// Add info into an object. Num in WaterInfo is used to make sure player doesn't get damaged by their water, and allows spectating eliminator
			FiredWater.push(WaterInfo);
			if (Practice == false) Update("FiredWater");
		}
	}	
}
World.onmousedown = Fire;

function Heal() {
	HealTime = 0;
	InHeal = false; // The player is no longer healing
	HP += HealerList[ElementNum].Heal;
	Shield += HealerList[ElementNum].ShieldHeal;
	if (HP > 100) HP = 100; // Prevents the player from having HP over max amount
	if (Shield > 50) Shield = 50;
	HPbar.value = HP; // Display HP
	Shieldbar.value = Shield; // Display Shield
}

function Moving() {	
	if (InGame == false | InHeal == true) return;
	let upkey = KeyBinds[0]; // Key to press to move up
	let leftkey = KeyBinds[1]; // Key to press to move left
	let rightkey = KeyBinds[2]; // Key to press to move right
	let downkey = KeyBinds[3]; // Key to press to move down

	for (let i = 0; i < SpawnedImgs.length; i++)
	{
		if (ScreenCheck(SpawnedImgs[i].X, SpawnedImgs[i].Y, "NoDraw", 0) == true & SpawnedImgs[i].Type == "Rock")
		{
			if (Keys[downkey] == true & y+45 <= SpawnedImgs[i].Y) PlayerPos[PlayerNum-1].Y += Speed;
		        if (Keys[upkey] == true & y-5 >= SpawnedImgs[i].Y) PlayerPos[PlayerNum-1].Y -= Speed;
			if (Keys[leftkey] == true & x-5 >= SpawnedImgs[i].X) PlayerPos[PlayerNum-1].X -= Speed;
			if (Keys[rightkey] == true & x+45 <= SpawnedImgs[i].X) PlayerPos[PlayerNum-1].X += Speed;
		}
	}
}

function PickUp() {
	// Run through all spawned images
	for (let i = 0; i < SpawnedImgs.length; i++)
	{
		// If the image can be picked up
		if (SpawnedImgs[i].Type == "Bush" | SpawnedImgs[i].Type == "Rock") continue;
		// If player is touching image (able to pick up)
		if (CollideCheck(PlayerPos[PlayerNum-1].X, SpawnedImgs[i].X, PlayerPos[PlayerNum-1].Y, SpawnedImgs[i].Y, 40, 30) == false) continue;

		// Run through the inventory
		for (let j = 0; j < Inventory.length; j++)
		{
			// To check which the soonest inventory slot that is empty for the player to be able to pick up the image and place into this slot
			if (Inventory[j] == "")
			{
				Inventory[j] = SpawnedImgs[i].Type; // Fill this slot
				HeldImg = document.getElementById(`Held${j+1}`);
				HeldImg.src = `https://WtrWar.github.io/${SpawnedImgs[i].Type}.png`; // Display that this in in the inventory
				SpawnedImgs.splice(i, 1); // This removes the image information from the world so when the world is redrawn, this will not appear
				if (Practice == false) Update("SpawnedImgs"); // remove img from game for others
				return;
			}
		}
	}
}

function Usage() {
	if (event.key == KeyBinds[4]) // If the player pressed the key to pick up an image
	{
		PickUp();
		return;
	}
	if (InHeal == true | InGame == false) return;
	if (event.key != KeyBinds[5] & event.key != KeyBinds[6] & event.key != KeyBinds[7] & event.key != KeyBinds[8]) return; // If the player did not press one of the keys necessary to change slot / use an items
	let SelectionKeys = [KeyBinds[5], KeyBinds[6], KeyBinds[7], KeyBinds[8]];
	// SelectionKeys = [Key to change to slot 1, Key to change to slot 2, ...]
	for (let i = 0; i < SelectionKeys.length; i++) 
	{
		if (SelectionKeys[i] != event.key) continue;
		// The key that the player pressed has been grabbed, and now knows what slot the player is accessing using the value of i
		if (CurrentSlot == -1)
		{
			// If no inventory slot is being held
			CurrentSlot = i+1;
			HeldImg = document.getElementById(`Held${CurrentSlot}`); // Grab the image of the slot the player is currently in
		}
		try {
			HeldImg = document.getElementById(`Held${CurrentSlot}`);
			HeldImg.classList.remove("Highlighted"); // Unhighlight slot previously held
		}
		catch {}
		CurrentSlot = i+1;
	}
	HeldImg = document.getElementById("Held" + CurrentSlot);
    // Run through the Gear in the game
	for (let i = 0; i < GearList.length; i++)
	{
		// If one of these Gear are being held, highlight the slot
		if (Inventory[CurrentSlot-1] == GearList[i].Type)
		{
			HeldImg.classList.add("Highlighted");
		}
	}
	for (let i = 0; i < HealerList.length; i++)
	{
		if (Inventory[CurrentSlot-1] != HealerList[i].Type) continue;
		Inventory[CurrentSlot-1] = ""; // Empty this slot in inventory
		HeldImg.src = "https://WtrWar.github.io/GearSquare.png";
		InHeal = true; // Prevents the player from moving/firing/changing slot while healing
		ElementNum = i; // To access the healing given in the Heal function
		HealTime = HealerList[ElementNum].Duration/1000;
		HealInfo.textContent = `${HealTime}s`; // Show how long before the player has healed
		setTimeout(Heal, HealerList[ElementNum].Duration); // Heal the player after the set time
	}
}
document.onkeypress = Usage;


// MULTIPLAYER FUNCTIONS
function MatchMake() {
	if (MyData.Name == "") 
	{
		alert("Create or sign into an account to play Multiplayer");
		return;
	}
	checking = setInterval(GameStart, 1000); // Check if there are enough players every 1s
}
EnterGame.onclick = MatchMake;

function UpdateScreen() {
	if (PlayerCount == 1 & Practice == false) 
	{
		GameEnded();
		clearInterval(drawing);
	}
	if (Practice == false) 
	{
		MultiplayerDelay++;
		if (MultiplayerDelay%4 == 0) // The game is at 40FPS, and the Multiplayer information will update at 10FPS to save on data
		{
			Update("PlayerData"); // Reduce the running from Moving() 
			Read(); 
		}
	}
	if (HealTime > 0)
	{
		HealInfo.textContent = `${Math.ceil(HealTime)}s`;
		HealTime -= (1/40); // Because the game runs at 40FPS, the game will be reduced 40 times a second, so this needs to be reduced by 1/40 so this is accurate
	}
	if (HealTime <= 0) HealInfo.textContent = "";

	myX = PlayerPos[PlayerNum-1].X;
	myY = PlayerPos[PlayerNum-1].Y;

	let topX = TheZone.TopX - myX + World.width/2; // Where to draw the left/top side of the zone compared to player
	let topY = TheZone.TopY - myY + World.height/2; // Where to draw the left/top side of the zone compared to player
	let bottomX = TheZone.BottomX - myX + World.height/2; // Where to draw the bottom/right side of the zone
	let dist = bottomX-topX; // How long the zone is from the left to right. Since the zone is always a square, this is also the dist for Y

	ctx.fillStyle = "blue";
	ctx.fillRect(0, 0, World.width, World.height);
	ctx.fillStyle = "lightgreen";
	
	ctx.fillRect(topX, topY, dist, dist); // Draw the zone in the world
	
	if (Practice == false)
	{
		for (let i = 1; i < PlayerPos.length+1; i++) // make Opponents appear (Be red)
		{	
			if (i == PlayerNum) continue; // Don't display the player as red
			if (PlayerPos[i-1].In == "false") ScreenCheck(PlayerPos[i-1].X, PlayerPos[i-1].Y, GameImgs[3], 40); // If the Opponent was eliminated, display a skull
			if (PlayerPos[i-1].In == "true") ScreenCheck(PlayerPos[i-1].X, PlayerPos[i-1].Y, GameImgs[1], 40); // If the Opponent is alive, display player as red
		}
	}
	if (PlayerPos[PlayerNum-1].In == "false") ctx.drawImage(GameImgs[3], World.width/2, World.height/2, 40, 40); // If player eliminated, show skull
	if (PlayerPos[PlayerNum-1].In == "true") ctx.drawImage(GameImgs[0], World.width/2, World.height/2, 40, 40); // If player alive, show orange

	for (let i = 0; i < SpawnedImgs.length; i++) // Grab coordiantes of each image
	{
		let x = SpawnedImgs[i].X;
		let y = SpawnedImgs[i].Y;
		for (let j = 0; j < GameImgs.length; j++)
		{
			if (SpawnedImgs[i].Type == ImgNames[j]) // ImgNames and GameImgs Parallel, grab the image of what to display
			{
				// Display the image
				ScreenCheck(SpawnedImgs[i].X, SpawnedImgs[i].Y, GameImgs[j], SpawnedImgs[i].HW);
			}
		}
	}

	for (let i = 0; i < GearList.length; i++)
	{
		// If a Gear is being held
		if (Inventory[CurrentSlot-1] == GearList[i].Type & HeldImg != null)
		{
			// Display max range with black
			ctx.setLineDash([8, 15]);
			ctx.beginPath();
			ctx.arc(World.width/2, World.height/2, GearList[i].Range, 0, 2*Math.PI);
			ctx.strokeStyle = "black";
			ctx.stroke();
			// Display min range with red
			ctx.beginPath();
			ctx.arc(World.width/2, World.height/2, GearList[i].MinRange, 0, 2*Math.PI);
			ctx.strokeStyle = "red";
			ctx.stroke();
		}
	}

	FireTime += (1/40);	// Increase the counter of how long since the player shot
	for (let i = 0; i < FiredWater.length; i++) // Make fired waters appear.
	{
		if (PlayerNum == PlayerCount) // If the player is the last to join, they will run this
		{
			FiredWater[i].X = FiredWater[i].X + FiredWater[i].Xgrad;
			FiredWater[i].Y = FiredWater[i].Y + FiredWater[i].Ygrad;
			// Move the fired water along its chosen direction
		}
		if (FiredWater[i].Num != PlayerNum) // If the fired water was not shot by the player
		{
			if (CollideCheck(PlayerPos[PlayerNum-1].X, FiredWater[i].X, PlayerPos[PlayerNum-1].Y, FiredWater[i].Y, 40, 30) == true & InGame == true) // If the player collided with another player's shot
			{
				Shield -= FiredWater[i].Dmg; // Take damage
				if (Shield < 0)
				{
					HP += Shield; // If Shield became -30, now HP loses 30, Shield is now 0
					Shield = 0;
				}
				if (HP <= 0) 
				{ 
					PlayerPos[PlayerNum-1].In = "false";
					GameEnded();
					SpectateName.textContent = `Spectating: ${PlayerPos[num-1].Name}`;
					PlayerNum = FiredWater[i].Num; // Spectate the eliminator
				}
				FiredWater.splice(i, 1); // Remove the fired water
				if (Practice == false) Update("FiredWater");
			}
		}

		if (PlayerNum == PlayerCount) // Run only for last player to join
		{
			for (let j = 0; j < SpawnedImgs.length; j++)
			{
			if (SpawnedImgs[j].Type != "Rock") continue;
				if (CollideCheck(FiredWater[i].X, SpawnedImgs[j].X, FiredWater[i].Y, SpawnedImgs[j].Y, 30, 90) == false) // If any fired water collided with any rocks in the game, remove the water
						FiredWater.splice(i, 1);
			}
			if (CollideCheck(FiredWater[i].X, FiredWater[i].TargetX, FiredWater[i].Y, FiredWater[i].TargetY, 8, 8) == true) // If the fired water hit its destination
			{
				FiredWater.splice(i, 1);
			}
		}
		ScreenCheck(FiredWater[i].X, FiredWater[i].Y, GameImgs[2], 30); // Draw all fired water
		if (PlayerNum == PlayerCount & Practice == false) Update("FiredWater");
	}
	Players.textContent = `${PlayerCount} players`;
 } 
	
function ZoneSystem() {	
	TheZone.Time -= 1; // Time until the next zone closes reduced
	let CurrentZone = TheZone.CurrentZone, SizeChange;
	try {SizeChange = Zones[CurrentZone-2].Sizing - Zones[CurrentZone-1].Sizing;} // The amount that the zone still needs to shrink during the current zone
	catch {SizeChange = 3000 - Zones[0].Sizing;}
	TheZone.Shrink = Math.ceil(SizeChange/Zones[CurrentZone-1].Length);
	
	// Shrink the zone in the object
	TheZone.TopX += TheZone.Shrink/2;
	TheZone.TopY += TheZone.Shrink/2;
	TheZone.BottomX -= TheZone.Shrink/2;
	TheZone.BottomY -= TheZone.Shrink/2;
	
	TimeLeft.textContent = `Closing time left: ${TheZone.Time}s`;
	// Changing the World from 3000 -> 200 (15 times smaller) to make minimap
	let left = (TheZone.TopX)/15;
	let ZoneSize = (TheZone.BottomX-TheZone.TopX)/15;
	Minimap.fillStyle = "blue";
	Minimap.fillRect(0, 0, 200, 200);
	Minimap.fillStyle = "lightgreen";
	Minimap.fillRect(left, left, ZoneSize, ZoneSize);
	Minimap.fillStyle = "black";
	Minimap.fillRect((PlayerPos[PlayerNum-1].X)/15, PlayerPos[PlayerNum-1].Y/15, 40/15, 40/15);
	
	// If the player doesn't collide with the zone, therefore not inside
	if (CollideCheck(PlayerPos[PlayerNum-1].X, TheZone.TopX, PlayerPos[PlayerNum-1].Y, TheZone.TopY, 40, TheZone.BottomX-TheZone.TopX) == false)
	{
		// Take damage
	    HP -= Zones[CurrentZone-1].Dmg;
		HPbar.value = HP;
		if (HP <= 0 & InGame == true) 
		{
			PlayerPos[PlayerNum-1].In = "false";
			// Grab random number 1-4, and check if same as PlayerNum. If not, PlayerNum = RandomNumber, if so, repeat again. (spectating a random player)
			GameEnded();
			let num = Math.ceil(Math.random()*4);
			while (num == PlayerNum) num = Math.ceil(Math.random()*4);
			PlayerNum = num;
		}
	}
	if (TheZone.Time == 0)
	{
	    if (CurrentZone == Zones.length) // When the final zone has fully closed, this will remove from view or be accessible by placing it far off screen
		{
			TheZone.TopX = 4000;
		    TheZone.TopY = 4000;
			TheZone.BottomX = 4000;
			TheZone.BottomY = 4000;
		}
		if (CurrentZone < Zones.length)
		{
			ZoneDisplay.textContent = `Closing zone: ${CurrentZone += 1}`;
			TheZone.CurrentZone += 1; // Move to the next zone
			TheZone.Time = Zones[CurrentZone-1].Length;
		}
    }	
} 

function Read() {
	db.collection('Game').get().then((snapshot) => {
		snapshot.docs.forEach(doc => {// Runs through each doc in Game collection in firebase
			// For efficiency, particularly when using large amounts of information for SpawnedImgs, instead of using a field for x, y, and type: For each spawned image, taking 300* lines of code, all firebase information was changed to a csv format to make reading simpler
			let str = "";
			GameLoaded = doc.data().Began;
			
			if (PlayerCount > doc.data().PlayerCount & GameLoaded == false & PlayerNum > PlayerCount) // Player left matchmaking, and: Eg Player1 left so Player3 now Player2. Player2 now Player1.
			{
				PlayerNum--;
			}

			let mine = {X: PlayerPos[PlayerNum-1].X, Y: PlayerPos[PlayerNum-1].Y, In: PlayerPos[PlayerNum-1].In, Name: PlayerPos[PlayerNum-1].Name}; // Hold your own data so you do not read your data in firebase. This is because other players could be updating your data and cause issues
			
			PlayerPos = [];
			str = doc.data().PlayerData; // The CSV of players data
			let Objects = str.split('/'); // Objects now splits each player's data, still in a CSV form
			for (let i = 0; i < Objects.length; i++)
			{
				if (i == PlayerNum-1 & Practice == false) // Making player location update less frequent than other reading causes the position to be incorrect. By saving the position this issue does not occur and saves reading/update amount
				{
					PlayerPos.push({X: mine.X, Y: mine.Y, In: mine.In, Name: mine.Name});
					continue;
				}
				let Obj = Objects[i].split(','); // For each object in Objects, this is split so the x, y, Name and In are contained in a new object and no more CSVs involved and added to PlayerPos. This process turns the csv into a list of objects, and is almost identical for SpawnedImgs and FiredWater
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
	let CsvString = "", TempList; // This string will be used to update firebase data in a CSV format

	// TEST         
	if (DataType == 'PlayerData') TempList = PlayerPos;
	if (DataType == 'SpawnedImgs') TempList = SpawnedImgs;
	if (DataType == 'FiredWater') TempList = FiredWater;
	if (TempList != null)
	{
		for (let i = 0; i < TempList.length; i++)
		{
			for (var Property in TempList)
			{
	                      let piece = TempString.Property;
				CsvString = CsvString+`${piece}`;
			}
	                if (i != TempList.length-1) CsvString = CsvString+'\'
                 }
                 if (DataType == 'PlayerPos')
		 {
			 db.collection('Game').doc('GameData').update({
				"PlayerData": CsvString,
				"PlayerCount": PlayerCount,
				"Began": GameLoaded,
			 })
		 }
		if (DataType == 'SpawnedImgs')
		{
			db.collection('Game').doc('GameData').update({"SpawnedImgs": CsvString})
		}
		if (DataType == 'FiredWater')
		{
			db.collection('Game').doc('GameData').update({"FiredWater": CsvString})
		}
	}
        //
	
	if (DataType == "MyAcc")
	{
		// When the player has finished their game, update their account data
		db.collection('Accounts').doc(MyData.Name).update({
			"TotGames": MyData.TotGames,
			"TotWins": MyData.TotWins,
			"AvgPlace": MyData.AvgPlace,
		})
	}
}

	
// Menu Options
function ShowControls() {alert("Press 1/2/3/4 to use inventory, WASD to move, and F to pick up. The controls will be different if changed in settings")}
Controls.onclick = ShowControls;
	
function HowToPlay() {
	alert("Begin a match to be paired against 4 opponents. Click on a nearby gear or healer to pick it up. Click when holding a gear and within the black circle, but outside the red circle (if visible) to fire to eliminate opponents. The starting size is 3000px.");
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
	GameStart(); // This will start the game as regularly, however Practice = true will prevent multiplayer processes
}
EnterPractice.onclick = StartPractice;
	
function ChangeScreen() {
	if (window.event.target.id == "Back") // Exiting to Menu
	{
		Menu.classList.remove("hide");
		SettingScreen.classList.add("hide");
		AccountScreen.classList.add("hide");
		Back.classList.add("hide");
	        return;
	}	
	Back.classList.remove("hide"); 
	Menu.classList.add("hide");
	if (window.event.target.id == "Settings") SettingScreen.classList.remove("hide");
	if (window.event.target.id == "Accounts") AccountScreen.classList.remove("hide");
}
Settings.onclick = ChangeScreen;
Back.onclick = ChangeScreen;
Accounts.onclick = ChangeScreen;
	
function SignUpOrIn() {	
	var Data; // This is TRY to grab the data of the account the player is signing into or creating
	if (window.event.target.id == "SignIn") var SignIn = true; 
	if (window.event.target.id == "SignUp")
	{
		let Name = NameMake.value, Pass = PassMake.value;
		if (Name.length >= 4 & Name.length <= 12 & Pass.length >= 4 & Pass.length <= 12) // The username and password have acceptable length
		{
			var SignIn = false;
			if (Name == "Username" | Pass == "Password") return; // Unacceptable
		}
		else return; // Unacceptable
	}
	db.collection('Accounts').get().then((snapshot) => {
		snapshot.docs.forEach(doc => {
			if (SignIn == true & doc.id == Name.value | SignIn == false & doc.id == NameMake.value) // If trying to sign in, grab information of desired account. If trying to make account, check try to grab data of it to see if it does exist
			{
				Data = doc.data(); // Grabs password and other info as object. Makes sign in or up simpler
			}
		})
	})
	if (SignIn == true) 
	{
		setTimeout(function() {
			// Data was used to check if the account exists. If Data is null, then this account does not exist and so the username does not have a match. If/Or the password is incorrect then it will fail
			if (Data == null | Data.Password != Pass.value)
			{
				alert("Wrong username/password");
				return;
			}
			alert("Successful sign in");
			MyData = {Name: Name.value, TotGames: Data.TotGames, TotWins: Data.TotWins, AvgPlace: Data.AvgPlace}; // Grabs the data from firebase to update when game ends
		}, 500)
	}
	if (SignIn == false)
	{
		setTimeout(function() {
			if (Data != null) // Exists
			{
				alert("An account already has same name");
				return;
			}
			// Add a new account into firebase for sign ins
			db.collection('Accounts').doc(NameMake.value).set({
			    Password: PassMake.value,
			    TotGames: 0,
			    TotWins: 0,
				AvgPlace: 0,
		    })
			alert("Account made");
			MyData = {Name: Name.value, TotGames: 0, TotWins: 0, AvgPlace: 0}; // Grabs the data from firebase to update when game ends
	    }, 500)
	}
	setTimeout(function() {
		ShowName.textContent = `Signed into: ${MyData.Name}`;
		EnterGame.textContent = "Multiplayer";
	    ShowGames.textContent = `Total games: ${MyData.TotGames}`;
		ShowWins.textContent = `Total wins: ${MyData.TotWins}`;
		ShowPlace.textContent = `Average placement: ${MyData.AvgPlace}`;
	}, 1000)
}
SignIn.onclick = SignUpOrIn;
SignUp.onclick = SignUpOrIn;

function ChangeBinds() {
	let char = NewKey.value; // This is the key the player input to change a bind
	char = char.toLowerCase();
	char = char.trim(); // This is to remove all spaces and keep the keys lowercase to prevent holding shift being necessary for actions
	if (char.length != 1) return; // Prevents a bind being empty or more than one key (which will prevent the action similar to being empty)
	if (ChangingKeys[9] == 0) // Starting to change all binds
	{
		Back.classList.add("hide");
		KeyBinds = ['', '', '', '', '', '', '', '', '']; // To reset the current binds so these can be all adjusted. If not, then issues will occur from the code that rejects a key being used for 2 controls
		ChangingKeys[9] = 0;
	}
	let num = ChangingKeys[9]; // ChangingKeys[9] will contain the information of which element in ChangingKeys to display on screen (State what key to change and change this in KeyBinds as they are parallel)
	for (let i = 0; i < KeyBinds.length-1; i++) // Runs through all currently set binds to prevent a key being used twice
	{
		if (char == KeyBinds[i] | char.charCodeAt(0) == KeyBinds[i]) // Already binded
	    {
			alert("Already a used key");
			return;
		}
	}
	KeyBinds[num] = char; // Makes the bind change
	if (num < 4) // Binds for moving. Need to be in Unicode for diagonal movement to be possible
	{
		KeyBinds[num] = char.charCodeAt(0); // converts to UniCode
	}
	ChangingKeys[9] = num += 1; // Now will increase the counter so the next bind to change will be displayed and will be changed correctly because of the parallel arrays
	KeyToChange.textContent = "Press " + ChangingKeys[num]; // First will access element 1, then element 2...
	NewKey.value = "";
	if (num == 9) // Accessing the number and not a bind
	{
		ChangingKeys[9] = 0; // Ends changing bind process
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
		
		let points = MyData.AvgPlace*MyData.TotGames;
		points += PlayerCount;
		MyData.TotGames++;
		MyData.AvgPlace = points/MyData.TotGames; // Calculates new average placement by grabbing the "points" and then adding how the player placed with PlayerCount, and dividing this when the player has had another game
		if (PlayerCount == 1) MyData.TotWins++; 
			
	    Info.classList.add("hide");
		InGame = false;
		PlayerCount--;
		if (Practice == false) Update("PlayerData"); // Reduce the playercount for others
		if (PlayerCount == 0) // The last player in the game needs the reset the values for the next game
		{
			Practice = true; // This prevents the game from reading/writing anymore like a practice game
			db.collection('Game').doc('GameData').update({
				"Began": false,
				"FiredWater": "",
				"SpawnedImgs": "",
				"PlayerData": "50,50,true,Name/2950,50,true,Name/50,2950,true,Name/2950,2950,true,Name",
				"PlayerCount": 0,
			})
		}
		Update("MyAcc"); // Update stat data
	}
	else if (Practice == true) 
	{
		clearInterval(zonerun);
		alert("You were eliminated");
		location.reload(); // Reload page
	}
}

function RemovePlayer() {
	if (Practice == false)
	{
		PlayerCount--;
		// Add 1 to games played and adjust the average placement
		let points = MyData.AvgPlace*MyData.TotGames;
		points += PlayerCount;
		MyData.TotGames++;
		MyData.AvgPlace = points/MyData.TotGames;
		Update("MyAcc");
		Update("PlayerData");
	}
}
window.onbeforeunload = RemovePlayer;
	
function KeyDown() {
    Keys = (Keys || []);	
	let key = event.key;
    Keys[key.charCodeAt(0)] = true; // Save that the player is pressing the key    
	Moving();              
	Usage();
}
document.onkeydown = KeyDown;

function KeyUp() {
	let key = event.key;
	Keys[key.charCodeAt(0)] = false; // Save that the key is no longer held down
}
document.onkeyup = KeyUp;

function ScreenCheck(x, y, Name, size) {
	let xCoord = x - myX + World.width/2;
	let yCoord = y - myY + World.height/2;
	
	// Checks if the image information will be displayed on screen using its coordinates compared to the sizing of the world
	if (xCoord >= -(World.width) & xCoord <= World.width & yCoord >= -(World.height) & yCoord <= World.height)
	{
		if (Name != "NoDraw") ctx.drawImage(Name, xCoord, yCoord, size, size);
		return true; // It is on screen
	}
	return false; // It is not on screen
}
	
function CollideCheck(X1, X2, Y1, Y2, Length1, Length2) {
	// Two images locations and sizes are tranferred into the function to check if they have collide
	if (X1+Length1 < X2 | X1 > X2+Length2) return false;
	if (Y1+Length1 < Y2 | Y1 > Y2+Length2) return false;
	return true;
}
	
// Tells the player if they are not online
if (navigator.onLine == true) Read();
if (navigator.onLine == false) {
	alert("Not connected to the internet. Reconnect first and reload page.");
	Menu.classList.add("hide");
}
