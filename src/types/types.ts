export type IPv4Address = [number,number,number,number];
export type IPv6Address = [number,number,number,number,number,number,number,number];

export enum IPAddressType  {
    ipv6= 'ipv6-address',
    ipv4= 'ipv4-address'
}

export type IPAddress = {type:IPAddressType.ipv6, value:IPv4Address}|{type:IPAddressType.ipv4, value:IPv6Address};

