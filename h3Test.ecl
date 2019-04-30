IMPORT h3Mod.sample.def as def;
IMPORT Visualizer;

myTest := Visualizer.h3(def.cities.path, def.cities.layout, latitude, longitude);
myTest.BuildAll;
// #workunit('name', 'cities');
// myTest.Roxie;

//myTest2 := Visualizer.h3(def.Canada.path, def.Canada.layout, LAT, LON); 
//myTest2.BuildAll;
//#workunit('name', 'test');
//myTest2.Roxie;

/*
h3Idx := 594625131070881791;
res := lib_h3.h3.resolution(h3Idx);
res;
myTest.indexToString(h3Idx, res);
fds := myTest.Index15(i15_h3IndexStr[1..res] = myTest.indexToString(h3Idx, res)[1..res]);
OUTPUT(fds);
// RETURN CHOOSEN(FETCH(ds, fds, RIGHT.RecPos, xForm(LEFT)), 100);
*/
