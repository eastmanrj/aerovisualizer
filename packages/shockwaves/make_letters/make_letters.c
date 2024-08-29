/*
  To include letters when implementing THREE.js for 3D effects, the file 
  "helvetiker_regular.typeface.json" can be read and parsed.  As an alternative, we
  remove all of the letters that we don't need and then hard code the smaller
  file into our code.  To do this, we use the program cJSON that was written by
  Dave Gamble.  Follow these steps:

  1. Gather the files cJSON.c, cJSON.h, make_letters.c, and helvetiker_regular.typeface.json.

  2. Modify make_letters.c such that you are generating a FORMATTED
     copy of the original unformatted json file.  Save make_letters.c.

  3. If using a Macintosh, open a UNIX terminal and type 
     clang cJSON.c make_letters.c
     This creates the executable a.out.

     If not a Macintosh, compile the C files however works best for your system.

  4. On the Macintosh, run the executable like this:
     
     ./a.out > any_name

     On another system, run the executable with whatever name you gave it.

  5. Open the output file in a text editor and remove the unwanted letters.  Save the file.

  6. Modify make_letters.c again, but this time you are generating an UNFORMATTED
     copy of the file that you just edited.  Save make_letters.c.

  7. Do steps 3 and 4 again.

  8. Copy the contents of the output file to your Javascript code that uses THREE.js.




  Copyright (c) 2009 Dave Gamble
 
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:
 
  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.
 
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/

#include <stdio.h>
#include <stdlib.h>
#include "cJSON.h"


/* Parse text to JSON, then render back to text, and print unformatted */
void doUnformatted(char *text)
{
    char *out;cJSON *json;
    
    json=cJSON_Parse(text);
    if (!json) {printf("Error before: [%s]\n",cJSON_GetErrorPtr());}
    else
    {
        out= cJSON_PrintUnformatted(json);
        cJSON_Delete(json);
        printf("%s\n",out);
        free(out);
    }
}


/* Parse text to JSON, then render back to text, and print formatted */
void doFormatted(char *text)
{
    char *out;cJSON *json;
    
    json=cJSON_Parse(text);
    if (!json) {printf("Error before: [%s]\n",cJSON_GetErrorPtr());}
    else
    {
        out=cJSON_Print(json);
        cJSON_Delete(json);
        printf("%s\n",out);
        free(out);
    }
}

/* Read a file, parse, render back, etc. */
void dofile(char *filename)
{
    FILE *f;long len;char *data;
	
    f=fopen(filename,"rb");fseek(f,0,SEEK_END);len=ftell(f);fseek(f,0,SEEK_SET);
    data=(char*)malloc(len+1);fread(data,1,len,f);fclose(f);
    doUnformatted(data);
    free(data);
}

int main (int argc, const char * argv[]) {
    // dofile("./helvetiker_regular.typeface.json");
    dofile("./helvetiker_mod.json");

    return 0;
}



