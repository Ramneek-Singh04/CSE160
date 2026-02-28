class Model {
    constructor(filename, color) {
        this.type = 'model';
        this.color = color || [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.textureNum = -2; // Default to solid color

        this.vertices = null;
        this.normals = null;
        this.uvs = null;
        this.loaded = false; // Prevents rendering before fetch is complete

        // Fetch the OBJ file asynchronously
        fetch(filename)
            .then(response => {
                if (!response.ok) throw new Error("Network response was not ok");
                return response.text();
            })
            .then(text => this.parseOBJ(text))
            .catch(err => console.error("Error loading " + filename + ":", err));
    }

    parseOBJ(text) {
        let tempVertices = [];
        let tempNormals = [];
        let outVertices = [];
        let outNormals = [];
        let outUVs = [];

        let lines = text.split('\n');
        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('v ')) {
                // Parse vertex positions
                let parts = line.split(/\s+/);
                tempVertices.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
            } else if (line.startsWith('vn ')) {
                // Parse normal vectors
                let parts = line.split(/\s+/);
                tempNormals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
            } else if (line.startsWith('f ')) {
                // Parse faces (triangles)
                let parts = line.split(/\s+/);
                for (let i = 1; i <= 3; i++) { // Assuming triangulated faces (3 vertices per face)
                    let faceInfo = parts[i].split('/');

                    // OBJ indices are 1-based, array is 0-based
                    let vIdx = parseInt(faceInfo[0]) - 1;
                    outVertices.push(...tempVertices[vIdx]);

                    // Check if normals are provided (v/vt/vn or v//vn)
                    if (faceInfo.length > 2 && faceInfo[2] !== '') {
                        let nIdx = parseInt(faceInfo[2]) - 1;
                        outNormals.push(...tempNormals[nIdx]);
                    } else {
                        outNormals.push(0, 1, 0); // Dummy fallback normal
                    }
                    outUVs.push(0, 0); // Dummy UVs since we are doing solid colors
                }
            }
        }

        // Convert to WebGL-friendly typed arrays
        this.vertices = new Float32Array(outVertices);
        this.normals = new Float32Array(outNormals);
        this.uvs = new Float32Array(outUVs);
        this.loaded = true;
        console.log("Successfully loaded model with", this.vertices.length / 3, "vertices.");
    }

    renderFast() {
        // Only draw if the file has finished downloading and parsing!
        if (!this.loaded) return;

        gl.uniform1i(u_whichTexture, this.textureNum);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

        var normalMatrix = new Matrix4();
        normalMatrix.setInverseOf(this.matrix);
        normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        drawGeometryFast(this.vertices, this.uvs, this.normals);
    }
}