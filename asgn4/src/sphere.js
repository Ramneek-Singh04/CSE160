class Sphere {
    constructor() {
        this.type = 'sphere';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.textureNum = -2;

        let vertices = [];
        let uvs = [];
        let normals = [];

        let step = 10;

        for (let t = 0; t < 180; t += step) {
            for (let r = 0; r < 360; r += step) {

                let theta1 = t * Math.PI / 180;
                let theta2 = (t + step) * Math.PI / 180;
                let phi1 = r * Math.PI / 180;
                let phi2 = (r + step) * Math.PI / 180;

                let p1 = [Math.sin(theta1) * Math.cos(phi1), Math.cos(theta1), Math.sin(theta1) * Math.sin(phi1)];
                let p2 = [Math.sin(theta2) * Math.cos(phi1), Math.cos(theta2), Math.sin(theta2) * Math.sin(phi1)];
                let p3 = [Math.sin(theta2) * Math.cos(phi2), Math.cos(theta2), Math.sin(theta2) * Math.sin(phi2)];
                let p4 = [Math.sin(theta1) * Math.cos(phi2), Math.cos(theta1), Math.sin(theta1) * Math.sin(phi2)];

                let uv1 = [phi1 / (2 * Math.PI), theta1 / Math.PI];
                let uv2 = [phi1 / (2 * Math.PI), theta2 / Math.PI];
                let uv3 = [phi2 / (2 * Math.PI), theta2 / Math.PI];
                let uv4 = [phi2 / (2 * Math.PI), theta1 / Math.PI];

                vertices.push(...p1, ...p2, ...p4);
                uvs.push(...uv1, ...uv2, ...uv4);
                normals.push(...p1, ...p2, ...p4);

                vertices.push(...p4, ...p2, ...p3);
                uvs.push(...uv4, ...uv2, ...uv3);
                normals.push(...p4, ...p2, ...p3);
            }
        }

        this.vertices = new Float32Array(vertices);
        this.uvs = new Float32Array(uvs);
        this.normals = new Float32Array(normals);
    }

    renderFast() {
        gl.uniform1i(u_whichTexture, this.textureNum);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

        // Calculate and pass the Normal Matrix
        var normalMatrix = new Matrix4();
        normalMatrix.setInverseOf(this.matrix);
        normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        drawGeometryFast(this.vertices, this.uvs, this.normals);
    }
}