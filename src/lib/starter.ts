// The routine the app ships with, and the source of the sheet templates.
// Weights start empty because this is your first log.
export const STARTER = {
  exercises: `name,muscle,video_url,cues,equipment
Bench Press,Chest,https://www.youtube.com/watch?v=lWFknlOTbyM,"Elbows at 45 degrees, bar to mid chest.",barbell
Incline Press,Chest,https://www.youtube.com/watch?v=IP4oeKh1Sd4,"Bench at 30 degrees, control the way down.",dumbbell
Shoulder Press,Shoulders,https://www.youtube.com/watch?v=KP1sYz2VICk,"Ribs down, press straight overhead.",barbell
Cable Fly,Chest,https://www.youtube.com/watch?v=8Um35Es-ROE,"Slight elbow bend, squeeze at the middle.",cable
Lateral Raise,Shoulders,https://www.youtube.com/watch?v=pgrWjBfaFe8,"Lead with the elbows, stop at shoulder height.",dumbbell
Triceps Pushdown,Arms,https://www.youtube.com/watch?v=-zLyUAo1gMw,Pin elbows to your sides.,cable
Lat Pulldown,Back,https://www.youtube.com/watch?v=43hWj8mfYGY,Pull elbows down to your ribs.,cable
Barbell Row,Back,https://www.youtube.com/watch?v=FWJR5Ve8bnQ,"Flat back, pull to your lower chest.",barbell
Seated Row,Back,https://www.youtube.com/watch?v=vwHG9Jfu4sw,"Sit tall, squeeze your shoulder blades.",cable
Face Pull,Shoulders,https://www.youtube.com/watch?v=V8dZ3pyiCBo,"Pull to your forehead, elbows high.",cable
Hammer Curl,Arms,https://www.youtube.com/watch?v=BRVDS6HVR9Q,"Palms facing in, no swinging.",dumbbell
Barbell Curl,Arms,https://www.youtube.com/watch?v=QZEqB6wUPxQ,Keep elbows still at your sides.,barbell
Squat,Legs,https://www.youtube.com/watch?v=aOzrA4FgnM0,"Brace first, knees track over toes.",barbell
Romanian Deadlift,Legs,https://www.youtube.com/watch?v=3VXmecChYYM,"Hips back, soft knees, flat back.",barbell
Leg Press,Legs,https://www.youtube.com/watch?v=K5n2vg3oZa4,Lower back stays on the pad.,machine
Leg Curl,Legs,https://www.youtube.com/watch?v=1Tq3QdYUuHs,Slow on the way back up.,machine
Calf Raise,Legs,https://www.youtube.com/watch?v=SVtg-1loH4c,"Full stretch at the bottom, pause at the top.",machine
`,
  routine: `day_order,day_name,exercise,sets,rep_min,rep_max,rest_sec,increment_kg,superset
1,Push,Bench Press,4,8,12,90,2.5,
1,Push,Incline Press,3,8,12,90,2,
1,Push,Shoulder Press,3,8,12,90,2.5,
1,Push,Cable Fly,3,10,15,60,2.5,
1,Push,Lateral Raise,3,12,20,60,1,
1,Push,Triceps Pushdown,3,10,15,60,2.5,
2,Pull,Lat Pulldown,4,8,12,90,2.5,
2,Pull,Barbell Row,4,6,10,120,2.5,
2,Pull,Seated Row,3,10,12,90,2.5,
2,Pull,Face Pull,3,12,20,60,2.5,
2,Pull,Hammer Curl,3,8,12,60,1,
2,Pull,Barbell Curl,3,8,12,60,2.5,
3,Legs,Squat,4,6,10,150,5,
3,Legs,Romanian Deadlift,3,8,12,120,5,
3,Legs,Leg Press,3,10,15,120,10,
3,Legs,Leg Curl,3,10,15,60,2.5,
3,Legs,Calf Raise,4,12,20,60,5,
`,
  settings: `key,value
weekly_target,4
bar_kg,20
plate_kg,25
plate_kg,20
plate_kg,15
plate_kg,10
plate_kg,5
plate_kg,2.5
plate_kg,1.25
`,
  app: `key,value
min_version,
update_url,
`,
};
