// The routine the app ships with, and the source of the sheet templates.
// Phase 2 of the 100 Day Bollywood Body Program, with the starter exercises kept for swaps.
export const STARTER = {
  exercises: `name,muscle,video_url,cues,equipment
Incline Bench Press,Chest,https://www.youtube.com/watch?v=DbFgADa2PL8,"Bench at 30 degrees, bar to upper chest.",barbell
Incline Press,Chest,https://www.youtube.com/watch?v=IP4oeKh1Sd4,"Bench at 30 degrees, control the way down.",dumbbell
Flat Dumbbell Fly,Chest,https://www.youtube.com/watch?v=eozdVDA78K0,"Slight elbow bend, stretch wide, squeeze up.",dumbbell
Machine Incline Press,Chest,https://www.youtube.com/watch?v=ig0NyNlSce4,Seat so handles line up with upper chest.,machine
Dumbbell Shoulder Press,Shoulders,https://www.youtube.com/watch?v=rO_iEImwHyo,"Back on the pad, press straight up.",dumbbell
Lateral Raise,Shoulders,https://www.youtube.com/watch?v=pgrWjBfaFe8,"Lead with the elbows, stop at shoulder height.",dumbbell
Triceps Pushdown,Arms,https://www.youtube.com/watch?v=-zLyUAo1gMw,Pin elbows to your sides.,cable
Skull Crushers,Arms,https://www.youtube.com/watch?v=S0fmDR60X-o,"Elbows still, lower to the forehead. Then 15-20 min easy cardio.",ez bar
Lat Pulldown,Back,https://www.youtube.com/watch?v=43hWj8mfYGY,Pull elbows down to your ribs.,cable
T-Bar Row,Back,https://www.youtube.com/watch?v=j3Igk5nyZE4,"Flat back, pull to your lower chest.",machine
Seated Row,Back,https://www.youtube.com/watch?v=vwHG9Jfu4sw,"Sit tall, squeeze your shoulder blades.",cable
Face Pull,Shoulders,https://www.youtube.com/watch?v=V8dZ3pyiCBo,"Pull to your forehead, elbows high.",cable
Dumbbell Shrugs,Back,https://www.youtube.com/watch?v=cJRVVxmytaM,"Straight up and down, pause at the top.",dumbbell
Dumbbell Bicep Curls,Arms,https://www.youtube.com/watch?v=sAq_ocpRh_I,"Palms up, no swinging.",dumbbell
Preacher Curls,Arms,https://www.youtube.com/watch?v=DoCWeUBA0Gs,"Upper arms flat on the pad, full stretch. Then 15-20 min easy cardio.",ez bar
Squat,Legs,https://www.youtube.com/watch?v=aOzrA4FgnM0,"Brace first, knees track over toes.",barbell
Leg Extension,Legs,https://www.youtube.com/watch?v=YyvSfVjQeL0,Pause and squeeze at the top.,machine
Leg Press,Legs,https://www.youtube.com/watch?v=K5n2vg3oZa4,Lower back stays on the pad.,machine
Leg Curl,Legs,https://www.youtube.com/watch?v=1Tq3QdYUuHs,Slow on the way back up.,machine
Walking Lunges,Legs,https://www.youtube.com/watch?v=D7KaRcUTQeE,"Long steps, back knee nearly touches. Reps are steps.",dumbbell
Calf Raise,Legs,https://www.youtube.com/watch?v=SVtg-1loH4c,"Full stretch at the bottom, pause at the top.",machine
Back Extension,Back,https://www.youtube.com/watch?v=ph3pddpKzzw,"Hinge at the hips, stop when your body is straight. Then 15-20 min easy cardio.",bodyweight
Bench Press,Chest,https://www.youtube.com/watch?v=lWFknlOTbyM,"Elbows at 45 degrees, bar to mid chest.",barbell
Shoulder Press,Shoulders,https://www.youtube.com/watch?v=KP1sYz2VICk,"Ribs down, press straight overhead.",barbell
Cable Fly,Chest,https://www.youtube.com/watch?v=8Um35Es-ROE,"Slight elbow bend, squeeze at the middle.",cable
Barbell Row,Back,https://www.youtube.com/watch?v=FWJR5Ve8bnQ,"Flat back, pull to your lower chest.",barbell
Hammer Curl,Arms,https://www.youtube.com/watch?v=BRVDS6HVR9Q,"Palms facing in, no swinging.",dumbbell
Barbell Curl,Arms,https://www.youtube.com/watch?v=QZEqB6wUPxQ,Keep elbows still at your sides.,barbell
Romanian Deadlift,Legs,https://www.youtube.com/watch?v=3VXmecChYYM,"Hips back, soft knees, flat back.",barbell
`,
  routine: `day_order,day_name,exercise,sets,rep_min,rep_max,rest_sec,increment_kg,superset
1,Push,Incline Bench Press,3,10,12,90,2.5,
1,Push,Incline Press,3,12,14,90,2,
1,Push,Flat Dumbbell Fly,3,15,17,60,2,
1,Push,Machine Incline Press,3,12,14,90,2.5,
1,Push,Dumbbell Shoulder Press,3,10,12,90,2,
1,Push,Lateral Raise,3,15,17,60,1,
1,Push,Triceps Pushdown,3,12,14,60,2.5,
1,Push,Skull Crushers,3,12,14,60,2.5,
2,Pull,Lat Pulldown,3,12,14,90,2.5,
2,Pull,T-Bar Row,3,12,14,90,2.5,
2,Pull,Seated Row,3,12,14,90,2.5,
2,Pull,Face Pull,3,12,14,60,2.5,
2,Pull,Dumbbell Shrugs,3,15,17,60,2,
2,Pull,Dumbbell Bicep Curls,3,12,14,60,1,
2,Pull,Preacher Curls,3,12,14,60,2.5,
3,Legs,Squat,4,10,12,90,2.5,
3,Legs,Leg Extension,3,15,17,60,2.5,
3,Legs,Leg Press,3,12,14,90,5,
3,Legs,Leg Curl,3,12,14,60,2.5,
3,Legs,Walking Lunges,3,20,22,90,2,
3,Legs,Calf Raise,3,15,17,60,2.5,
3,Legs,Back Extension,3,15,17,60,2.5,
`,
  settings: `key,value
weekly_target,6
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
  // From the program's warm-up and cool-down guide. seconds is the hold per side, for the timer.
  warmup: `day_name,phase,name,amount,how,seconds,sides
Push,warmup,Treadmill walk or cross trainer,"3 min, light pace",Raises your heart rate and blood flow.,180,
Push,warmup,Arm circles,15 each direction,"Forward, then backward. Loosens the shoulders.",,
Push,warmup,Band pull-aparts,15 reps,No band? Just squeeze your shoulder blades. Warms the rear delts and rotator cuff.,,
Push,warmup,Push-ups,10-15 reps,"Slow and controlled. Wakes up chest, triceps and shoulders.",,
Push,warmup,Light lateral raises,"15 reps, very light",Warms up the side delts.,,
Push,warmup,Warm-up set,15 reps at 50%,One light set of your first exercise.,,
Push,cooldown,Doorway chest stretch,30 sec each arm,"Arm on the door frame at 90°, lean forward through it.",30,2
Push,cooldown,Overhead triceps stretch,30 sec each arm,"Arm overhead, bend the elbow, push it down with your other hand.",30,2
Push,cooldown,Cross-body shoulder stretch,30 sec each arm,Pull your arm across your body with the other hand.,30,2
Push,cooldown,Chest opener,30 sec,"Clasp your hands behind your back, lift your arms and squeeze your shoulder blades.",30,
Push,cooldown,Neck rolls,30 sec,"Slow circles, both directions.",30,
Pull,warmup,Rowing machine or cross trainer,"3 min, light pace",Raises your heart rate and wakes up your back.,180,
Pull,warmup,Arm circles,15 each direction,"Forward, then backward. Loosens the shoulders.",,
Pull,warmup,Cat-cow,10 slow reps,On hands and knees. Loosens the spine.,,
Pull,warmup,Band pull-aparts,15 reps,Wakes up the rear delts and rhomboids.,,
Pull,warmup,Straight arm pulldown,"15 reps, light",Light cable or band. Wakes up the lats.,,
Pull,warmup,Warm-up set,15 reps at 50%,One light set of your first exercise.,,
Pull,cooldown,Lat stretch,30 sec each side,Grab a pole or door frame overhead and lean away from it.,30,2
Pull,cooldown,Child's pose,45 sec,"Kneel, sit back on your heels, reach your arms forward on the floor.",45,
Pull,cooldown,Biceps wall stretch,30 sec each arm,"Arm straight against the wall, palm flat, turn your body away.",30,2
Pull,cooldown,Upper trap stretch,30 sec each side,Tilt your head to the side and gently pull with your hand.,30,2
Pull,cooldown,Thread the needle,30 sec each side,"On all fours, reach one arm under your body and rotate.",30,2
Legs,warmup,Incline walk or cycling,"3-5 min, moderate pace",Raises your heart rate and warms up your legs.,180,
Legs,warmup,Hip circles,"10 each direction, each leg",Standing. Loosens the hips.,,
Legs,warmup,Leg swings,"10 each direction, each leg","Front to back, then side to side.",,
Legs,warmup,Glute bridges,15 reps,"Bodyweight, squeeze at the top.",,
Legs,warmup,Bodyweight squats,15 reps,"Slow, full depth. Grooves the squat pattern.",,
Legs,warmup,Walking lunges,10 each leg,"Bodyweight. Warms knees, hips, quads and glutes.",,
Legs,warmup,Squat warm-up sets,"15 reps bar only, then 10 at 50%",Two light sets before your working sets.,,
Legs,cooldown,Standing quad stretch,30 sec each leg,"Stand on one leg, pull your foot to your glute, knees together.",30,2
Legs,cooldown,Standing hamstring stretch,30 sec each leg,"Foot on a bench, lean forward with a straight back.",30,2
Legs,cooldown,Pigeon pose,45 sec each leg,"Front leg bent at 90°, back leg straight behind you, lean forward.",45,2
Legs,cooldown,Hip flexor stretch,30 sec each leg,"Lunge with your back knee down, push your hips forward.",30,2
Legs,cooldown,Butterfly stretch,45 sec,"Sit with the soles of your feet together, gently push your knees down.",45,
Legs,cooldown,Calf stretch,30 sec each leg,"Foot against the wall, lean in with your heel down.",30,2
`,
};
