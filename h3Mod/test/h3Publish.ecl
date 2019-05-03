IMPORT $.def as def;
IMPORT $.^.^.Visualizer;
IMPORT lib_h3;

myTest := Visualizer.h3(def.cities.path, def.cities.layout, latitude, longitude);
//myTest.BuildAll;
#workunit('name', 'cities');
myTest.Roxie; 

/*
h3Idx:=lib_h3.h3.index(0, 0, 0);
res := lib_h3.h3.resolution(h3Idx);
strIndex := lib_h3.h3.toData(h3Idx);
strIndex[1..res + 1]; 
myTest.Index15(i15_index[1..res + 1] = (STRING)strIndex[1..res + 1]);
myTest.Index15(KEYED(i15_index[1..res + 1] = (STRING)strIndex[1..res + 1]));
myTest.Index15(i15_index[1..2] = '3B');
myTest.Index15(KEYED(i15_index[1..1] = '3B'));

// myTest.rowCount(h3Idx);
// myTest.fetchRows(h3Idx);

/*
h3Idx := lib_h3.h3.index(0, 0, 15);
h3Idx;
h3Idx00a := lib_h3.h3.parent(h3IDx, 0);
h3Idx00a;
myTest.indexRead(h3Idx00a);
'local';
res := lib_h3.h3.resolution(h3Idx00a);
strIndex := lib_h3.h3.toData(h3Idx00a);
strIndex;
strIndex[1..res + 1];
LIMIT(myTest.RowCountIndex(KEYED(rct_h3Index = (DATA16)strIndex[1..res + 1])), 1);
myTest.rowCount(h3Idx00a)
*/

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
