class Camera {
    constructor() {
        this.fov = 60;

        // These use the Vector3 class from your cuon-matrix.js library
        this.eye = new Vector3([0, 0, 3]);   // Start a bit back so we can see the sloth
        this.at = new Vector3([0, 0, -100]); // Look into the distance
        this.up = new Vector3([0, 1, 0]);   // Y is up

        this.viewMatrix = new Matrix4();
        this.projectionMatrix = new Matrix4();

        // Initialize the matrices immediately
        this.updateView();
        this.updateProjection();
    }

    updateView() {
        this.viewMatrix.setLookAt(
            this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
            this.at.elements[0], this.at.elements[1], this.at.elements[2],
            this.up.elements[0], this.up.elements[1], this.up.elements[2]
        );
    }

    updateProjection() {
        // fov, aspect ratio, near, far
        this.projectionMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 1000);
    }

    moveForward(speed = 0.2) {
        var f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);
        f.normalize();
        f.mul(speed);
        this.eye.add(f);
        this.at.add(f);
        this.updateView();
    }

    moveBackwards(speed = 0.2) {
        var b = new Vector3();
        b.set(this.eye);
        b.sub(this.at);
        b.normalize();
        b.mul(speed);
        this.eye.add(b);
        this.at.add(b);
        this.updateView();
    }

    moveLeft(speed = 0.2) {
        var f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);
        f.normalize();

        // s = up x f (Cross product)
        var s = Vector3.cross(this.up, f);
        s.normalize();
        s.mul(speed);

        this.eye.add(s);
        this.at.add(s);
        this.updateView();
    }

    moveRight(speed = 0.2) {
        var f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);
        f.normalize();

        // s = f x up (Opposite cross product)
        var s = Vector3.cross(f, this.up);
        s.normalize();
        s.mul(speed);

        this.eye.add(s);
        this.at.add(s);
        this.updateView();
    }

    panLeft(alpha = 5) {
        var f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);

        var rotationMatrix = new Matrix4();
        rotationMatrix.setRotate(alpha, this.up.elements[0], this.up.elements[1], this.up.elements[2]);

        var f_prime = rotationMatrix.multiplyVector3(f);

        this.at.set(this.eye);
        this.at.add(f_prime);
        this.updateView();
    }

    panRight(alpha = 5) {
        var f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);

        var rotationMatrix = new Matrix4();
        rotationMatrix.setRotate(-alpha, this.up.elements[0], this.up.elements[1], this.up.elements[2]);

        var f_prime = rotationMatrix.multiplyVector3(f);

        this.at.set(this.eye);
        this.at.add(f_prime);
        this.updateView();
    }

    moveUp(speed = 0.2) {
        this.eye.elements[1] += speed;
        this.at.elements[1] += speed;
        this.updateView();
    }

    moveDown(speed = 0.2) {
        this.eye.elements[1] -= speed;
        this.at.elements[1] -= speed;
        this.updateView();
    }
}