// The routine the app ships with, and the source of the sheet templates.
// Weights start empty because this is your first log.
export const STARTER = {
  exercises: `name,muscle,video_url,cues
Bench Press,Chest,,"Elbows at 45 degrees, bar to mid chest."
Incline Press,Chest,,"Bench at 30 degrees, control the way down."
Shoulder Press,Shoulders,,"Ribs down, press straight overhead."
Cable Fly,Chest,,"Slight elbow bend, squeeze at the middle."
Lateral Raise,Shoulders,,"Lead with the elbows, stop at shoulder height."
Triceps Pushdown,Arms,,Pin elbows to your sides.
Lat Pulldown,Back,,Pull elbows down to your ribs.
Barbell Row,Back,,"Flat back, pull to your lower chest."
Seated Row,Back,,"Sit tall, squeeze your shoulder blades."
Face Pull,Shoulders,,"Pull to your forehead, elbows high."
Hammer Curl,Arms,,"Palms facing in, no swinging."
Barbell Curl,Arms,,Keep elbows still at your sides.
Squat,Legs,,"Brace first, knees track over toes."
Romanian Deadlift,Legs,,"Hips back, soft knees, flat back."
Leg Press,Legs,,Lower back stays on the pad.
Leg Curl,Legs,,Slow on the way back up.
Calf Raise,Legs,,"Full stretch at the bottom, pause at the top."
`,
  routine: `day_order,day_name,exercise,sets,rep_min,rep_max,rest_sec,increment_kg
1,Push,Bench Press,4,8,12,90,2.5
1,Push,Incline Press,3,8,12,90,2
1,Push,Shoulder Press,3,8,12,90,2.5
1,Push,Cable Fly,3,10,15,60,2.5
1,Push,Lateral Raise,3,12,20,60,1
1,Push,Triceps Pushdown,3,10,15,60,2.5
2,Pull,Lat Pulldown,4,8,12,90,2.5
2,Pull,Barbell Row,4,6,10,120,2.5
2,Pull,Seated Row,3,10,12,90,2.5
2,Pull,Face Pull,3,12,20,60,2.5
2,Pull,Hammer Curl,3,8,12,60,1
2,Pull,Barbell Curl,3,8,12,60,2.5
3,Legs,Squat,4,6,10,150,5
3,Legs,Romanian Deadlift,3,8,12,120,5
3,Legs,Leg Press,3,10,15,120,10
3,Legs,Leg Curl,3,10,15,60,2.5
3,Legs,Calf Raise,4,12,20,60,5
`,
  settings: `key,value
weekly_target,4
`,
};
