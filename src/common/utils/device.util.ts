import type { Request } from 'express';
import { DeviceType } from '@prisma/client';
import { DeviceInfo } from '../types/device-info.type';

export class DeviceUtil {
  static extractDeviceInfo(req: Request): DeviceInfo {
    const userAgent = this.getHeaderValue(req.headers, 'user-agent', 'Unknown');

    let ip = this.getIp(req);

    const forwarded = this.getHeaderValue(req.headers, 'x-forwarded-for');
    if (forwarded && forwarded !== 'Unknown') {
      ip = forwarded.split(',')[0]?.trim() || ip;
    }

    let deviceName = this.getDeviceName(req);

    let deviceType = this.getHeaderValue(req.headers, 'x-device-type');
    if (deviceType === 'Unknown') {
      deviceType = this.detectDeviceType(userAgent);
    }

    return {
      userAgent,
      ip,
      deviceName,
      deviceType: deviceType as DeviceType,
    };
  }

  private static getHeaderValue(
    headers: any,
    key: string,
    defaultValue: string = 'Unknown',
  ): string {
    const value = headers[key];
    if (!value) return defaultValue;
    if (Array.isArray(value)) {
      return value[0] || defaultValue;
    }
    return value;
  }

  private static detectDeviceType(userAgent: string): string {
    if (!userAgent) return DeviceType.OTHER;

    const ua = userAgent.toLowerCase();

    if (
      ua.includes('mobile') ||
      ua.includes('android') ||
      ua.includes('iphone')
    ) {
      return DeviceType.MOBILE;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return DeviceType.TABLET;
    }
    if (ua.includes('windows') || ua.includes('mac') || ua.includes('linux')) {
      return DeviceType.DESKTOP;
    }
    return DeviceType.WEB;
  }

  private static getIp(req: Request) {
    let ip =
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'Unknown';
    if (req.headers['x-forwarded-for']) {
      const forwarded = req.headers['x-forwarded-for'];
      if (Array.isArray(forwarded)) {
        ip = forwarded[0] || ip;
      } else {
        ip = forwarded.split(',')[0]?.trim() || ip;
      }
    }
    return ip;
  }

  private static getDeviceName(req: Request) {
    let deviceName =
      req.headers['x-device-name'] || req.headers['device-name'] || 'Unknown';
    if (Array.isArray(deviceName)) {
      deviceName = deviceName[0] || 'Unknown';
    }
    return deviceName;
  }
}
