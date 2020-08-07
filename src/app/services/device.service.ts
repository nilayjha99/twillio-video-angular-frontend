import { Injectable } from '@angular/core';
import { ReplaySubject, Observable } from 'rxjs';

export type Devices = MediaDeviceInfo[];

@Injectable({
    providedIn: 'root'
})

export class DeviceService {
    // device list updated observer
    $devicesUpdated: Observable<Promise<Devices>>;

    // subject to observe devices (camera and microphone)
    private deviceBroadcast = new ReplaySubject<Promise<Devices>>();

    constructor() {
        if (navigator && navigator.mediaDevices) {
            // update devices when a new device is added or removed
            navigator.mediaDevices.ondevicechange = (_: Event) => {
                this.deviceBroadcast.next(this.getDeviceOptions());
            }
        }

        // setv observer for the devices broadcast
        this.$devicesUpdated = this.deviceBroadcast.asObservable();
        // send message to observer - deviceUpdated
        // get list of available devices 
        this.deviceBroadcast.next(this.getDeviceOptions());
    }

    // check if user has granted camera permissions when prompted by browser
    // if not granted, make a request 
    private async isGrantedMediaPermissions() {
        if (navigator && navigator['permissions']) {
            try {
                const result = await navigator['permissions'].query({ name: 'camera' });
                if (result) {
                    if (result.state === 'granted') {
                        return true;
                    } else {
                        const isGranted = await new Promise<boolean>(resolve => {
                            result.onchange = (_: Event) => {
                                const granted = _.target['state'] === 'granted';
                                if (granted) {
                                    resolve(true);
                                }
                            }
                        });

                        return isGranted;
                    }
                }
            } catch (e) {
                // This is only currently supported in Chrome.
                // https://stackoverflow.com/a/53155894/2410379
                return true;
            }
        }

        return false;
    }

    // look for available devices
    private async getDeviceOptions(): Promise<Devices> {
        const isGranted = await this.isGrantedMediaPermissions();
        if (navigator && navigator.mediaDevices && isGranted) {
            let devices = await this.tryGetDevices();
            if (devices.every(d => !d.label)) {
                devices = await this.tryGetDevices();
            }
            return devices;
        }

        return null;
    }

    // fetch list of connected devices for Audio-Video in/out
    private async tryGetDevices() {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const devices = ['audioinput', 'audiooutput', 'videoinput'].reduce((options, kind) => {
            return options[kind] = mediaDevices.filter(device => device.kind === kind);
        }, [] as Devices);

        return devices;
    }
}