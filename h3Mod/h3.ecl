EXPORT h3(__path__, __layout__, __lat__, __lng__) := FUNCTIONMACRO

    RETURN MODULE
        IMPORT lib_h3;

        EXPORT STRING path := __path__;
        EXPORT STRING postfix := '::h3';
        EXPORT STRING indexPath := path + postfix + '::index';
        EXPORT STRING resPath := path + postfix + '::summary';

        EXPORT Layout := RECORD(__layout__)
        END;

        EXPORT ds := DATASET(path, {layout, UNSIGNED8 RecPos{VIRTUAL(fileposition)}}, THOR);

        EXPORT IndexParts := RECORD
            DATA1 part;
        END;

        EXPORT Index15 := INDEX(ds, {
                i15_index{XPATH('h3Index')} := lib_h3.h3.toData(lib_h3.h3.index(__lat__, __lng__, 15))
            }, {
                RecPos
            }, indexPath);

        EXPORT RowCountTable(res) := TABLE(Index15, {
                DATA16 rct_h3Index{XPATH('h3Index')} := i15_index[1..res + 1], 
                rct_rowCount{XPATH('rowCount')} := COUNT(GROUP)
            }, i15_index[1..res + 1]);

        EXPORT RowCountIndex := INDEX(
                RowCountTable(0) + 
                RowCountTable(1) + 
                RowCountTable(2) + 
                RowCountTable(3) + 
                RowCountTable(4) + 
                RowCountTable(5) + 
                RowCountTable(6) + 
                RowCountTable(7) + 
                RowCountTable(8) + 
                RowCountTable(9) + 
                RowCountTable(10) + 
                RowCountTable(11) + 
                RowCountTable(12) + 
                RowCountTable(13) + 
                RowCountTable(14) + 
                RowCountTable(15), {
                rct_h3Index
            }, {
                rct_rowCount
            }, resPath);

        //  Build  ---
        EXPORT BuildIndex15 := BUILDINDEX(Index15, OVERWRITE);

        EXPORT buildRowCountIndex := FUNCTION 
            RETURN BUILDINDEX(RowCountIndex, OVERWRITE);
        END;

        EXPORT BuildAll := PARALLEL(
            BuildIndex15,
            buildRowCountIndex
        );

        //  Roxie Service  ---
        EXPORT indexRead(UNSIGNED8 h3Idx) := FUNCTION
            res := lib_h3.h3.resolution(h3Idx);
            strIndex := lib_h3.h3.toData(h3Idx);
            RETURN LIMIT(RowCountIndex(KEYED(rct_h3Index = (DATA16)strIndex[1..res + 1])), 1);
        END;

        EXPORT rowCount(UNSIGNED8 h3Idx) := FUNCTION
            found := indexRead(h3Idx);
            RETURN IF(COUNT(found) = 0, 0, found[1].rct_rowCount);
        END;

        EXPORT ChildRecord := RECORD
            REAL8 lat;
            REAL8 lng;
            Layout payload;
        END;

        EXPORT fetchRows(UNSIGNED8 h3Idx) := FUNCTION
            res := lib_h3.h3.resolution(h3Idx);
            strIndex := lib_h3.h3.toData(h3Idx);
            ChildRecord xForm(ds L):= TRANSFORM
                SELF.lat := L.__lat__;
                SELF.lng := L.__lng__;
                SELF.payload := L;
            END;

            fds := Index15(KEYED(i15_index = (DATA16)strIndex[1..res + 1]));

            RETURN CHOOSEN(FETCH(ds, fds, RIGHT.RecPos, xForm(LEFT)), 10000);
        END;

        EXPORT StrIndexRecord := RECORD
            STRING h3Index;
        END;
        EXPORT EmptyStrIndexDS := DATASET([], StrIndexRecord);

        EXPORT IndexRecord := RECORD
            UNSIGNED8 h3Index;
        END;
        EXPORT EmptyIndexDS := DATASET([], IndexRecord);

        EXPORT RowCountRecord := RECORD
            STRING16 h3Index;
            UNSIGNED6 rowCount;
            DATASET(ChildRecord) childRows;
        END;
        EXPORT EmptyRowCountDS := DATASET([], RowCountRecord);

        EXPORT EmptyPolyDS := DATASET([], lib_h3.h3_point_t);

        EXPORT calcIndexSet(DATASET(StrIndexRecord) indexStrSet) := FUNCTION 
            RowCountRecord xForm(StrIndexRecord L) := TRANSFORM
                SELF.h3Index := L.h3Index;
                SELF.rowCount := rowCount(lib_h3.h3.fromString(L.h3Index));
                SELF.childRows := DATASET([], ChildRecord)
            END;

            items := PROJECT(indexStrSet, xForm(LEFT));    
            RETURN items(rowCount > 0);
        END;

        EXPORT calcPolySet(DATASET(lib_h3.h3_point_t) polySet, INTEGER4 res, UNSIGNED4 childThreshold) := FUNCTION 
            indexSet := DATASET(lib_h3.h3.polyfill(polySet, res), IndexRecord);

            RowCountRecord xForm(IndexRecord L) := TRANSFORM
                SELF.h3Index := lib_h3.h3.toString(L.h3Index);
                SELF.rowCount := rowCount(L.h3Index);
                SELF.childRows := IF(SELF.rowCount > 0 AND SELF.rowCount < childThreshold, fetchRows(L.h3Index), DATASET([], ChildRecord));
            END;

            items := PROJECT(indexSet, xForm(LEFT));    
            RETURN items(rowCount > 0);
        END;

        EXPORT Roxie := FUNCTION
            STRING17 h3Index := '' : stored('h3Index');
            DATASET(StrIndexRecord) h3IndexSetStr := EmptyStrIndexDS : stored('h3IndexSet');
            DATASET(lib_h3.h3_point_t) h3PolySet := EmptyPolyDS : stored('h3PolySet');
            UNSIGNED4 childThreshold := 20 : stored('childThreshold');
            UNSIGNED4 h3PolySetRes := 0 : stored('h3PolySetRes');

            indexCountSet := 
                IF(COUNT(h3IndexSetStr) > 0, calcIndexSet(h3IndexSetStr), 
                IF(COUNT(h3PolySet) > 0, calcPolySet(h3PolySet, h3PolySetRes, childThreshold), 
                EmptyRowCountDS));

            RETURN PARALLEL(
                OUTPUT(IF(h3Index != '', rowCount(lib_h3.h3.fromString(h3Index)), 0), NAMED('IndexCount')),
                OUTPUT(indexCountSet, ALL, NAMED('IndexCountSet')),
            );
        END;

        PI := ATAN(1)*4;

        REAL8 tilex2long(INTEGER4 x, INTEGER4 z) := FUNCTION
            RETURN  x / POWER(2.0, z) * 360.0 - 180;
        END;

        REAL8 tiley2lat(INTEGER4 y, INTEGER4 z) := FUNCTION
            n := PI - 2.0 * PI * y / POWER(2.0, z);
            return 180.0 / PI * ATAN(0.5 * (EXP(n) - EXP(-n)));
        END;

        EXPORT Roxie2 := FUNCTION
            UNSIGNED4 z := 0 : stored('z');
            UNSIGNED4 x := 0 : stored('x');
            UNSIGNED4 y := 0 : stored('y');
            UNSIGNED4 childThreshold := 20 : stored('childThreshold');

            h3PolySet := DATASET([
                {tiley2lat(y, z), tilex2long(x, z)},
                {tiley2lat(y, z), tilex2long(x + 1, z)},
                {tiley2lat(y + 1, z), tilex2long(x + 1, z)},
                {tiley2lat(y + 1, z), tilex2long(x, z)}
            ], lib_h3.h3_point_t);

            z1 := z - 3;
            z2 := IF (z1 < 0, 0, IF(z1 > 15, 15, z1));
            indexCountSet := calcPolySet(h3PolySet, z2, 10);

            RETURN PARALLEL(
                OUTPUT(indexCountSet, ALL, NAMED('IndexCountSet')),
            );
        END;

    END;

ENDMACRO;

R := RECORD
    REAL8 latXXX;
    REAL8 lngYYY;
    INTEGER pop;
END;

test := h3('', R, latXXX, lngYYY);
