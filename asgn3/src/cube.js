class Cube {
    constructor() {
        this.type = 'cube';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.textureNum = -2;

        // Pre-allocate all 36 vertices as a Float32Array
        this.vertices = new Float32Array([
            // Front
            0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0,
            // Top
            0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0,
            // Right
            1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1,
            // Left
            0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0,
            // Bottom
            0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1,
            // Back
            0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1
        ]);

        // Pre-allocate all 36 UVs as a Float32Array
        this.uvs = new Float32Array([
            // Front
            0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1,
            // Top
            0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0,
            // Right
            0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0,
            // Left
            0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1,
            // Bottom
            0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1,
            // Back
            0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1
        ]);
    }

    // The new, hyper-fast render function
    renderFast() {
        gl.uniform1i(u_whichTexture, this.textureNum);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

        // Pass the pre-made arrays to the fast draw function
        drawCubeFast(this.vertices, this.uvs);
    }

    render() {
        this.renderFast();
    }
}