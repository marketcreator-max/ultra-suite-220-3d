// All plan data in FEET, traced from the Suite 220 floor-plan image (scale 14.3 px = 1 ft,
// origin = suite top-left at image px (100,175)). x: west->east (0..56), z: north->south (0..49.3).
export const FT = 0.3048;
export const CEIL = 9, DOOR_H = 7, SILL = 3, HEAD = 7.5;
export const CENTER = [28, 24.6];
// wall: [x1,z1,x2,z2, thickness, openings[[from,to,type]] (offsets in ft along the wall from (x1,z1))]
// types: door | double | open | window | glassdoor | glass(full-height glass wall)
export const WALLS = [
  // ---- exterior (first 6) ----
  [0,0,37.4,0,0.75,[[0.6,14.6,'window'],[15.8,36.9,'window']]],            // north: Conference + Open Area
  [0,0,0,49.3,0.75,[[2,19,'window'],[33,47,'window']]],                      // west: Conference + Reception
  [0,49.3,56,49.3,0.75,[[6.3,9.4,'double']]],                                // south: main double-door entry
  [56,19.5,56,49.3,0.75,[[1.5,14,'window'],[17,28.5,'window']]],             // east: upper-right + bottom-right offices
  [37.4,0,37.4,19.5,0.5,[[0.5,12.6,'glass'],[12.8,15.8,'glassdoor'],[16,19,'glass']]], // Open Area <-> Terrace #3 (door ≈ px 655,380)
  [37.4,19.5,56,19.5,0.5,[[6,17.5,'window']]],                               // Terrace <-> upper-right office
  // ---- interior ----
  [0,21.3,15.2,21.3,0.4,[[11.5,14.3,'door']]],     // Conference south; door at bottom-right (px 285,455) into corridor
  [15.2,0,15.2,21.3,0.4,[]],                       // Conference east / Open Area west
  [15.2,21.3,15.2,25.5,0.4,[[0.3,3.3,'door']]],    // corridor east: door into Open Area 2 (px 330,500)
  [9.4,21.3,9.4,30.8,0.4,[]],                      // Kitchen east / corridor west
  [0,30.8,9.4,30.8,0.4,[[2.8,7.0,'open']]],        // Kitchen bottom opening into Reception (px 140-200)
  [16.4,36.7,16.4,49.3,0.4,[]],                    // straight run of the curved wall down to the south wall
  [15.2,25.5,21.7,25.5,0.4,[[1.8,4.8,'door']]],    // Closet north; door (px 365,545) into Open Area 2
  [21.7,25.5,21.7,35,0.4,[]],                      // Closet east
  [16.4,35,56,35,0.4,[[9.6,12.4,'door'],[22.9,25.6,'door'],[27.2,30,'door']]], // offices' north wall: BL, BC, BR doors
  [29.9,35,29.9,49.3,0.4,[]],                      // BL | BC
  [43.2,35,43.2,49.3,0.4,[]],                      // BC | BR
  [42,19.5,42,31,0.4,[]],                          // upper-right office west wall
  [42,31,46.5,31,0.4,[]],                          // door-cluster vestibule north
  [46.5,31,46.5,35,0.4,[[0.6,3.4,'door']]],        // upper-right office door (bottom-left corner, px 715,640)
];
// curved corridor wall: convex arc from px (300,580)->(335,700), bulging east
export const CURVE = {a:[15.2,25.5], b:[16.4,36.7], bulge:-1.8, seg:16, thick:0.4, opening:null};
export const COLUMN = [35.3,21.3,1.6];
export const ROOMS = [
 {id:'reception',name:'Reception',theme:'Reception',x:[0,16.4],z:[30.8,49.3],sqft:303,dims:'≈16 × 18.5 ft',
  floor:'#e9e6e2',light:'#ffe6d6',photos:['reception_01','reception_02','reception_03','reception_04','reception_05','reception_06'],
  features:['U-shaped curved desk with a red LED underglow','Main double-door entry on the south wall','Product shelving and a waiting sofa']},
 {id:'corridor',name:'Curved Corridor',theme:'Hall',x:[9.4,15.2],z:[21.3,30.8],sqft:57,dims:'≈6 × 9.5 ft',floor:'#e6e3df',light:'#fff1e6',
  photos:['hall_01','hall_02'],features:['Runs north from Reception past the kitchen','Conference door to the north, door east into Open Area 2','Sweeping curved wall with a red LED cove']},
 {id:'conference',name:'Conference Room',theme:'Consult',x:[0,15.2],z:[0,21.3],sqft:320,dims:'≈15 × 21 ft',floor:'#d9d4cf',light:'#fff3ea',
  photos:['office_01','lounge_10'],features:['Ten-seat conference table for consultations','Windows on the north and west walls']},
 {id:'kitchen',name:'Kitchen / Copy Room',theme:'Kitchen',x:[0,9.4],z:[21.3,30.8],sqft:89,dims:'≈9.5 × 9.5 ft',floor:'#d8d8d8',light:'#ffffff',
  photos:['kitchen_01'],features:['Counter run with sink and upper cabinets','Copier / print station','Open to Reception at the south']},
 {id:'closet',name:'Closet',theme:'Storage',x:[15.2,21.7],z:[25.5,35],sqft:60,dims:'≈6.5 × 9.5 ft',floor:'#cfcac4',light:'#fff',photos:[],features:['Storage closet; door opens into Open Area 2']},
 {id:'lounge',name:'Open Area: Lounge',theme:'Lounge',x:[15.2,37.4],z:[0,19.2],sqft:422,dims:'≈22 × 19 ft',floor:'#ece9e5',light:'#ffe9de',
  photos:['lounge_01','lounge_02','lounge_03','lounge_04','lounge_05','lounge_06','lounge_07','lounge_08'],
  features:['White sectional lounge with plants','Ribbon windows along the north wall','Glass wall and door out to Terrace #3']},
 {id:'terrace',name:'Terrace #3',theme:'Outdoor',x:[37.4,56],z:[0,19.5],sqft:360,dims:'≈18.5 × 19.5 ft (outdoor)',floor:'#8a8178',light:'#fff',outdoor:true,
  photos:[],features:['Outdoor deck off the lounge','Lounge chairs and planters','Not counted in the rentable area']},
 {id:'open2',name:'Open Area 2: Gallery Lounge',theme:'Lounge',x:[15.2,42],z:[19.2,35],sqft:360,dims:'≈26.5 × 16 ft',floor:'#ebe8e4',light:'#ffe2d6',
  photos:['lounge_09','lounge_11','lounge_12'],features:['Structural column wrapped in red light rings','Free-standing red-light therapy panels','Door cluster to all four treatment rooms']},
 {id:'vestibule',name:'Door Cluster',theme:'Hall',x:[42,46.5],z:[31,35],sqft:18,dims:'≈4.5 × 4 ft',floor:'#e6e3df',light:'#fff',
  photos:['hall_02'],features:['Doors to the Air and Fire rooms; Water and Earth open just to the west']},
 {id:'air',name:'AIR Room',theme:'Air',x:[42,56],z:[19.5,35],sqft:199,dims:'≈14 × 15.5 ft',floor:'#f2f2f2',light:'#ffffff',color:'#ffffff',
  photos:['air_01','air_02','air_03','air_04'],features:['Patio-facing treatment room beside Terrace #3','Pure-white light therapy, sky ceiling tiles','Twin treatment beds']},
 {id:'fire',name:'FIRE Room',theme:'Fire',x:[43.2,56],z:[35,49.3],sqft:183,dims:'≈13 × 14 ft',floor:'#2a2424',light:'#ff2a14',color:'#ff2010',
  photos:['fire_01','fire_02','fire_03','fire_04','fire_05','fire_06'],features:['Full red-light therapy room','LED candles and an amethyst geode on a plinth','Treatment bed under a red LED panel']},
 {id:'water',name:'WATER Room',theme:'Water',x:[29.9,43.2],z:[35,49.3],sqft:190,dims:'≈13 × 14 ft',floor:'#dfe6ee',light:'#4aa0ff',color:'#3b8cff',
  photos:['water_01','water_02','water_03','water_04','water_05','water_06'],features:['Blue light over a high-key base','Treatment bed under a blue LED panel','Wave mural and wave-glyph door sign']},
 {id:'earth',name:'EARTH Room',theme:'Earth',x:[16.4,29.9],z:[35,49.3],sqft:193,dims:'≈13.5 × 14 ft',floor:'#e3e6dc',light:'#4dff6a',color:'#38e05a',
  photos:['earth_01','earth_02','earth_03','earth_04','earth_05'],features:['Green feature wall and plants','Treatment bed under a green LED panel','Mountain-glyph door sign']},
];
// guided tour: pos [x,z], look [x,z] (feet)
export const TOUR = [
 {room:'reception',pos:[12.5,46.5],look:[5,37]},
 {room:'corridor',pos:[12.4,30],look:[12.6,21]},
 {room:'conference',pos:[12.8,19],look:[4,7]},
 {room:'kitchen',pos:[5.5,29.6],look:[3,22.5]},
 {room:'lounge',pos:[17.5,17],look:[32,5]},
 {room:'terrace',pos:[40,15.5],look:[52,7]},
 {room:'open2',pos:[25,32],look:[36,22]},
 {room:'air',pos:[44.3,26],look:[53,25]},
 {room:'fire',pos:[45,37.2],look:[52,45]},
 {room:'water',pos:[41,37.2],look:[34,45]},
 {room:'earth',pos:[27.5,37.2],look:[20,45]},
];
