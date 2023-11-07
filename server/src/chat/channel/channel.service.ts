import { Injectable } from '@nestjs/common';
import { CreateChannelDto } from './dtos';
import { PrismaService } from 'src/prisma/prisma.service';
import * as argon2 from 'argon2';
import { tr } from '@faker-js/faker';



@Injectable()
export class ChannelService {
  constructor(private prisma: PrismaService) {}


  async createchannel(channelData: CreateChannelDto) {
    try {
      console.log('ana hna');
      const find = await this.prisma.channel.findUnique({
        where: {
          name: channelData.channelName,
        },
      });
      if (find) return { status: 'channel already exists' };

      const hash = await argon2.hash(channelData.password);

      const channel = await this.prisma.channel.create({
        data: {
          name: channelData.channelName,
          type:
            channelData.type === 'Public'
              ? 'PUBLIC'
              : channelData.type === 'Private'
              ? 'PRIVATE'
              : 'PROTECTED',
          password: channelData.type === 'Protected' ? hash : '',
        },
      });

      delete channel.password;
      try {
        const channelMember = await this.prisma.channelMember.create({
          data: {
            role: 'OWNER',
            channel: {
              connect: { id: channel.id },
            },
            user: {
              connect: { id: channelData.userId },
            },
          },
        });
      } catch (error) {
        await this.prisma.channel.delete({
          where: {
            id: channel.id,
          },
        });
        console.log('no user to own the channel');
        return { status: "this user couldn't be found" };
      }

      console.log('creating new channel');
      return channel;
    } catch (error) {
      return "couldn' create channel";
    }
  }



  async getchannelinfo(id: string) {
    const findchannel = await this.prisma.channel.findUnique({
      where: {
        id: id,
      },
      include: {
        channelMember: true,
      },
    });
    if (findchannel) 
        return findchannel;
    else return { status: "couldn't found channel" };
  }

  async getallchannels(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        channelMember: true,
      },
    });

    let channels: any = await Promise.all(
      user.channelMember.map(async (channelmember) => {
        const channel = await this.getchannelinfo(channelmember.channelId);
        return channel;
      }),
    );
    return channels;
  }




  async checkPasswordChannel(channelName: string, password: string) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        name: channelName,
      },
      include: {
        channelmessages: true,
      },
    });
    if (await argon2.verify(channel.password, password)) {
      delete channel.password;
      return channel;
    }
    return { status: 'wrong password' };
  }




  async changepassword(
    channelName: string,
    userId: string,
    currentpassword: string,
    newpassword: string,
  ) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        name: channelName,
      },
    });

    const channelmembers = await this.prisma.channelMember.findMany({
      where: {
        userId: userId,
        channel: channel,
      },
    });
    const channelmember = channelmembers[0];
    if (channelmember.role === 'OWNER') {
      if (await argon2.verify(channel.password, currentpassword)) {
        const hash = await argon2.hash(newpassword);
        await this.prisma.channel.update({
          where: {
            name: channelName,
          },
          data: {
            password: hash,
          },
        });
      } else return { status: 'wrong password' };
    }
    console.log(channelmember);
    return channelmember;
  }


 

  async setpassword(channelId: string, userId: string, newpassword: string) {

    let channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId,
      },
    });

    const channelmembers = await this.prisma.channelMember.findMany({
      where: {
        userId: userId,
        channel: channel,
      },
    });
    const channelmember = channelmembers[0];
    if (channel.type === 'PUBLIC' || channel.type === 'PRIVATE') {
      if (channelmember.role === 'OWNER' || channelmember.role === 'ADMIN') {

        const hash = await argon2.hash(newpassword);
  
        channel = await this.prisma.channel.update({
          where: {
            id: channelId,
          },
          data: {
            password: hash,
            type: 'PROTECTED',
          },
        });
  
        return {channel: channel, status: "Password is set. Channel is private now"};
  
      } else return { status: 'you are not owner or admin of the channel' };
    }
    else return { status: 'channel is already protected' };
    
  }


  

  async removepassword(channelId: string, userId: string) {
    let channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId,
      },
    });

    let channelmembers = await this.prisma.channelMember.findMany({
      where: {
        userId: userId,
        channel: channel,
      },
    });
    let channelmember = channelmembers[0];

    if (channelmember.role === 'OWNER' || channelmember.role === 'ADMIN') {
      channel = await this.prisma.channel.update({
        where: {
          id: channel.id,
        },
        data: {
          password: '',
          type: 'PUBLIC',
        },
      });
      return {channel: channel, status: "Password is removed. Channel is public now"};
    } else return { status: 'you are not owner of the channel' };
  }
 


  async removeAdministrator(channelId:string, userIdOwner:string, userIdAdministrator:string){
    try {
      const channel = await this.prisma.channel.findUnique({
        where: {
          id: channelId,
        },
      });
  
      let channelMembers = await this.prisma.channelMember.findMany({
        where: {
          userId: userIdOwner,
          channel: channel,
        },
      });

      const channelOwner = channelMembers[0];
  
      channelMembers = await this.prisma.channelMember.findMany({
        where: {
          userId: userIdAdministrator,
          channel: channel,
        },
      });

      const channelAdministrator = channelMembers[0];

      
      if ( (channelOwner.role === 'OWNER' || channelOwner.role === "ADMIN") && channelAdministrator.role === 'ADMIN') {

        let member = await this.prisma.channelMember.update({
          where: {
            id: channelAdministrator.id,
          },
          data: {
            role: 'MEMBER',
          },
        });

        return { channelmember : member,  status: 'This administrator is now a member.' };

      } else {
        return { status: "This administrator can't be removed." };
      }
    } catch (error) {
      console.error('Error removing administrator:', error);
      throw new Error('Failed to remove administrator.');
    }
  }




  async setAdministrator(
    channelId: string,
    userIdOwner: string,
    userIdAdministrator: string,
  ) {
    try {
      const channel = await this.prisma.channel.findUnique({
        where: {
          id: channelId,
        },
      });
  
      let channelMembers = await this.prisma.channelMember.findMany({
        where: {
          userId: userIdOwner,
          channel: channel,
        },
      }); 
      const channelOwner = channelMembers[0];
  
      channelMembers = await this.prisma.channelMember.findMany({
        where: {
          userId: userIdAdministrator,
          channel: channel,
        },
      });
      const channelAdministrator = channelMembers[0];
  
      if (
        (channelOwner.role === 'OWNER' || channelOwner.role === 'ADMIN') &&
        channelAdministrator.role === 'MEMBER'
      ) {
        let member = await this.prisma.channelMember.update({
          where: {
            id: channelAdministrator.id,
          },
          data: {
            role: 'ADMIN',
          },
        });
        return { channelmember : member, status: 'This member is now an administrator.' };
      } else {
        return { status: "This member can't be set as an administrator." };
      }
    } catch (error) {
      console.error('Error setting administrator:', error);
      throw new Error('Failed to set administrator.');
    }
  }





  async removeMember(channelId: string,  userId: string, otherUserId: string) {

    try {
      
      const channel = await this.prisma.channel.findUnique({
        where: {
          id: channelId,
        },
      });
  
      let channelMembers = await this.prisma.channelMember.findMany({
        where: {
          userId: userId,
          channel: channel,
        },
      });
  
      const channelMember = channelMembers[0];
  
      channelMembers = await this.prisma.channelMember.findMany({
        where: {
          userId: otherUserId,
          channel: channel,
        },
      });
  
      const otherChannelMember = channelMembers[0];
  
      if (
        (channelMember.role === 'OWNER' || channelMember.role === 'ADMIN') &&
        (otherChannelMember.role === 'MEMBER'  || otherChannelMember.role === 'ADMIN')
      ) {
        let member = await this.prisma.channelMember.delete({
          where: {
            id: otherChannelMember.id,
          },
        });
        return { channelmember : member, status: 'This member is removed.' };
      } else {
        return { status: "This member can't be removed." };
      }


    } catch (error) {
      console.error('Error setting member:', error);
      throw new Error('Failed to remove member.');
    }
  }





  async inviteMember(
    channelName: string,
    userIdOwner: string,
    userIdMember: string,
  ) {


    const channel = await this.prisma.channel.findUnique({
      where: {
        name: channelName,
      },
    });

    const channelmembers = await this.prisma.channelMember.findMany({
      where: {
        userId: userIdOwner,
        channel: channel,
      },
    });

    const channelowner = channelmembers[0];
    delete channelmembers[0];


    try {
      const channelmembers = await this.prisma.channelMember.findMany({
        where: {
          userId: userIdMember,
          channel: channel,
        },
      });
      if (channelmembers.length === 1)
        return { status: "this user already member of the channel" };
    } catch (error) {

    }
    console.log(channelowner);
    if (
      channelowner.role === 'OWNER' ||
      channelowner.role === 'ADMIN'
    ) {
      const channelmember = await this.prisma.channelMember.create({
        data: {
          role: 'MEMBER',
          channel: {
            connect: { id: channel.id },
          },
          user: {
            connect: { id: userIdMember },
          },
        },
      });
      return channelmember;
    } else return { status: "this member can't invite member" };
  }


  async enterchannel(channelName: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        name: channelName,
      },
    });
    
    const channelmembers = await this.prisma.channelMember.findMany({
      where: {
        userId: userId,
        channel: channel,
      },
    });
    if (!channelmembers[0])
    {
      if (channel.type === 'PUBLIC') {
        const channelmember = await this.prisma.channelMember.create({
          data: {
            role: 'MEMBER',
            channel: {
              connect: { id: channel.id },
            },
            user: {
              connect: { id: userId },
            },
          },
        });
        return channel;
      }
      
    }
    else 
    { 
      return { status: "you are already member of the channel" };
    }
  }

  async getallmembers(id: string) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: id, 
      },
      include: {
        channelMember: true,
      },
    });
    
    if (channel) 
        return channel.channelMember;
    else 
        return { status: "couldn't found channel" };
  }

  async leaveChannel(channelName: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        name: channelName,
      },
    });
  
    if (!channel) {
      return { status: "couldn't found channel" };
    }
  
    const channelmembers = await this.prisma.channelMember.findMany({
      where: {
        userId: userId,
        channelId: channel.id,
      },
    });
  
    let channelmemberOwner = channelmembers[0];
  
    console.log("ana hna", channelmemberOwner);
  
    if (channelmemberOwner.role === 'OWNER') {

      console.log("ana hna owner");
  
      channelmemberOwner = await this.prisma.channelMember.delete({
        where: {
          id: channelmemberOwner.id,
        },
      });
  
      const channelmembers = await this.prisma.channelMember.findMany({
        where: {
          channelId: channel.id,
        },
      });
  
      const channelmember = channelmembers[0];
  
      if (channelmember) {
        await this.prisma.channelMember.update({
          where: {
            id: channelmember.id,
          },
          data: {
            role: 'OWNER', 
          },
        });
        return { status: 'you left the channel' };
      } else {

        console.log("delete channel");
        
        await this.prisma.channel.delete({
          where: {
            id: channel.id,
          },
        });
        
        return { status: 'you left the channel' };
      }
    }
  
  
    if (channelmemberOwner) {
      await this.prisma.channelMember.delete({
        where: {
          id: channelmemberOwner.id,
        },
      });
    }
  
    return { status: 'you left the channel' };
  }



   
  

  async deleteChannel(channelName: string, userId: string) {

    const channel = await this.prisma.channel.findUnique({
      where: {
        name: channelName,
      },
      include: {
        channelMember: true,
        channelmessages: true,
      },
    });
  
    if (!channel) {
      return { status: 'Channel not found' };
    }
  
    const channelMember = channel.channelMember.find(
      (member) => member.userId === userId
    );
  
    if (!channelMember || channelMember.role !== 'OWNER') {
      return { status: 'You are not the owner of the channel' };
    }
  
    await this.prisma.channelMessage.deleteMany({
      where: {
        reciverID: channel.id,
      },
    });
  
    await this.prisma.channel.delete({
      where: {
        name: channelName,
        // id: channel.id,
      },
      include: {
        channelMember: true,
      },
    });
  
    return { status: 'Channel deleted' };
  }





  async getchannelmemberinfo(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: {
        id: channelId,
      },
    });
    const channelmembers = await this.prisma.channelMember.findMany({
      where: {
        userId: userId,
        channel: channel,
      },
    });
    const channelmember = channelmembers[0];
    return channelmember;
  }
  
  async getallchannelsapp(tofound: string)
  {
    const channels = await this.prisma.channel.findMany({
      where: {
        name: {
          contains: tofound,
        },
      }
    });
    return channels;
  }


  async getallpublicandprivatechannels()
  {
    const channels = await this.prisma.channel.findMany({
      where: {
        OR: [
          {
            type: 'PUBLIC'
          },
          {
            type: 'PROTECTED'
          }
        ]
      }
    });
    return channels;
  }

}
