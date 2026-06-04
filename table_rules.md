* el cursor se tiene que poder mover libremente por toda la tabla

* el comportamiento "de celda" del cursor solo se activa con el smartselect

* Una tabla comienza con la secuencia `|-` a principio de linea. Los caracteres `|` y `-` de esa secuencia inicial se consideran líneas de tabla (table lines). Recursivamente, cualquier carácter `|` o `-` que sea adyacente (izquierda, derecha, arriba o abajo) a una línea de tabla ya identificada también se considera una línea de tabla.

    > Una tabla se define como el componente conexo formado por caracteres `|` y `-`, usando conectividad ortogonal (arriba, abajo, izquierda y derecha), que contiene una secuencia inicial `|-`.

* Editing cell content auto-resizes it in "real-time":
    - Inserting caracters (or spaces, tabs, or [INTRO]) ONLY make the cell bigger if needed
    - ONLY [BACKSPACE], [SUPR], or cutting make the cell smaller if needed  

* Editing cell content never changes the table topology (rows, columns, rowspans, colspans). It may only resize existing cells to fit their content.

* Table topology is modified only through layout editing mode ([º]) and never through ordinary text editing.

* The cursor is touching the table line when it is positioned on a table line character (`|` or `-`) or immediately adjacent to it horizontally

* For table topology editing, you must press [º] with the cursor touching the table line

* Writing `|` or `-` is interpreted as a layout modification only when the insertion point is touching a table line. This means that writing `-` or `|` touching a table line is not considered content editing and should not resize the cell or add padding


* When [º] is pressed with the cursor next to a table line, a table simplifying process is also done. 
    - It adjusts cell sizes to its content, removing extra paddings inside cell (the only padding left is one space after the left `|` and antoher before the right `|`. It also removes empty -or filled with space or tabs- lines at top of cell, and empty -or filled with space or tabs- lines at bottom of cell)
    - It removes unnecessary rowspans

* To create a single cell table, write `|-` and press [º] 

* To create a multi cell table write `|RxC` and press [º] (R is the number of rows and C is the number of columns). For example `|3x5` will create a table with 3 rows and 5 columns. 
    - This also works for adding cells to an existing table