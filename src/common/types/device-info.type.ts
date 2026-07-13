import { DeviceType } from "@prisma/client"

export interface DeviceInfo {
    userAgent: string
    ip: string
    deviceName: string
    deviceType: DeviceType
}
