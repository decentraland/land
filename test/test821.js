/**
 * Ported over from zeppelin-solidity tests for NonFungibleland.sol
 *
 * Given that the test is mostly for common functionality, it should work mostly as-is.
 *
 * Deleted functionality: `burn`
 */
import assertRevert from './helpers/assertRevert';
const BigNumber = web3.BigNumber;

const LANDRegistry = artifacts.require('LANDRegistry');
const LANDProxy = artifacts.require('LANDProxy');

const NONE = '0x0000000000000000000000000000000000000000';

function checkTransferLog(log, parcelId, from, to) {
  log.event.should.be.eq('Transfer');
  log.args.parcelId.should.be.bignumber.equal(parcelId);
  log.args.from.should.be.equal(from);
  log.args.to.should.be.equal(to);
}

function checkApproveLog(log, parcelId, from, to) {
  log.event.should.be.eq('Approve');
  log.args.parcelId.should.be.bignumber.equal(parcelId);
  log.args.owner.should.be.equal(from);
  log.args.beneficiary.should.be.equal(to);
}

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('LANDRegistry', (accounts) => {
  const [creator, user, anotherUser, operator, mallory] = accounts
  let registry = null, proxy = null;
  let land = null;
  const _name = 'LAND Registry';
  const _symbol = 'LAND Test';
  const _firstparcelId = 1;
  const _secondparcelId = 2;
  const _unknownparcelId = 3;

  beforeEach(async function () {
    console.log(accounts)
    proxy = await LANDProxy.new({ gas: 4e7, gasPrice: 21e9, from: creator })
    registry = await LANDRegistry.new({ gas: 6e7, gasPrice: 21e9, from: creator })
    await proxy.upgrade(registry.address, '', { from: creator })
    land = await LANDRegistry.at(proxy.address)
    await land.assignNewParcel(0, 1, user, { from: creator });
    await land.assignNewParcel(0, 2, anotherUser, { from: creator });
  });

  describe('name', function () {
    it('has a name', async function () {
      const name = await land.name();
      name.should.be.equal(_name);
    });
  });

  describe('symbol', function () {
    it('has a symbol', async function () {
      const symbol = await land.symbol();
      symbol.should.be.equal(_symbol);
    });
  });

  describe('totalSupply', function () {
    it('has a total supply equivalent to the inital supply', async function () {
      const totalSupply = await land.totalSupply();
      totalSupply.should.be.bignumber.equal(0);
    });
    it('has a total supply that increases after creating a new land', async function () {
      const totalSupply = await land.totalSupply();
      totalSupply.should.be.bignumber.equal(1);
    });
  });

  describe('balanceOf', function () {
    describe('when the given address owns some lands', function () {
      it('returns the amount of lands owned by the given address', async function () {
        const balance = await land.balanceOf(creator);
        balance.should.be.bignumber.equal(2);
      });
    });

    describe('when the given address owns some lands', function () {
      it('returns 0', async function () {
        const balance = await land.balanceOf(user);
        balance.should.be.bignumber.equal(0);
      });
    });
  });

  describe('ownerOf', function () {
    describe('when the given land ID was tracked by this land', function () {
      const parcelId = _firstparcelId;

      it('returns the owner of the given land ID', async function () {
        const owner = await land.ownerOf(parcelId);
        owner.should.be.equal(creator);
      });
    });

    describe('when the given land ID was not tracked by this land', function () {
      const parcelId = _unknownparcelId;

      it('returns 0', async function () {
        const owner = await land.ownerOf(parcelId);
        owner.should.be.equal(NONE);
      });
    });
  });

  describe('landOfOwnerByIndex', function () {
    describe('when the given address owns some lands', function () {
      const owner = creator;

      describe('when the given index is lower than the amount of lands owned by the given address', function () {
        const index = 0;

        it('returns the land ID placed at the given index', async function () {
          const parcelId = await land.landOfOwnerByIndex(owner, index);
          parcelId.should.be.bignumber.equal(_firstparcelId);
        });
      });

      describe('when the index is greater than or equal to the total lands owned by the given address', function () {
        const index = 2;

        it('reverts', async function () {
          await assertRevert(land.landOfOwnerByIndex(owner, index));
        });
      });
    });

    describe('when the given address does not own any land', function () {
      const owner = user;

      it('reverts', async function () {
        await assertRevert(land.landOfOwnerByIndex(owner, 0));
      });
    });
  });

  describe('mint', function () {
    describe('when the given land ID was not tracked by this contract', function () {
      const parcelId = _unknownparcelId;

      describe('when the given address is not the zero address', function () {
        const to = user;

        it('mints the given land ID to the given address', async function () {
          const previousBalance = await land.balanceOf(to);

          await land.mint(to, parcelId);

          const owner = await land.ownerOf(parcelId);
          owner.should.be.equal(to);

          const balance = await land.balanceOf(to);
          balance.should.be.bignumber.equal(previousBalance + 1);
        });

        it('adds that land to the land list of the owner', async function () {
          await land.mint(to, parcelId);

          const lands = await land.landsOf(to);
          lands.length.should.be.equal(1);
          lands[0].should.be.bignumber.equal(parcelId);

          const addedland = await land.landOfOwnerByIndex(to, 0);
          addedland.should.be.bignumber.equal(parcelId);
        });

        it('emits a transfer event', async function () {
          const { logs } = await land.mint(to, parcelId);

          logs.length.should.be.equal(1);
          checkTransferLog(logs[0], parcelId, NONE, to);
        });
      });

      describe('when the given address is the zero address', function () {
        const to = 0x0;

        it('reverts', async function () {
          await assertRevert(land.mint(to, parcelId));
        });
      });
    });

    describe('when the given land ID was already tracked by this contract', function () {
      const parcelId = _firstparcelId;

      it('reverts', async function () {
        await assertRevert(land.mint(user, parcelId));
      });
    });
  });

  describe('transfer', function () {
    describe('when the address to transfer the land to is not the zero address', function () {
      const to = user;

      describe('when the given land ID was tracked by this land', function () {
        const parcelId = _firstparcelId;

        describe('when the msg.sender is the owner of the given land ID', function () {
          const sender = creator;

          it('transfers the ownership of the given land ID to the given address', async function () {
            await land.transfer(to, parcelId, { from: sender });

            const newOwner = await land.ownerOf(parcelId);
            newOwner.should.be.equal(to);
          });

          it('clears the approval for the land ID', async function () {
            await land.approve(anotherUser, parcelId, { from: sender });

            await land.transfer(to, parcelId, { from: sender });

            const approvedAccount = await land.approvedFor(parcelId);
            approvedAccount.should.be.equal(NONE);
          });

          it('emits an approval and transfer events', async function () {
            const { logs } = await land.transfer(to, parcelId, { from: sender });

            logs.length.should.be.equal(2);
            checkApproveLog(logs[0], parcelId, sender, NONE)
            checkTransferLog(logs[1], parcelId, sender, to);
          });

          it('adjusts owners balances', async function () {
            const previousBalance = await land.balanceOf(sender);
            await land.transfer(to, parcelId, { from: sender });

            const newOwnerBalance = await land.balanceOf(to);
            newOwnerBalance.should.be.bignumber.equal(1);

            const previousOwnerBalance = await land.balanceOf(creator);
            previousOwnerBalance.should.be.bignumber.equal(previousBalance - 1);
          });

          it('places the last land of the sender in the position of the transferred land', async function () {
            const firstlandIndex = 0;
            const lastlandIndex = await land.balanceOf(creator) - 1;
            const lastland = await land.landOfOwnerByIndex(creator, lastlandIndex);

            await land.transfer(to, parcelId, { from: sender });

            const swappedland = await land.landOfOwnerByIndex(creator, firstlandIndex);
            swappedland.should.be.bignumber.equal(lastland);
            await assertRevert(land.landOfOwnerByIndex(creator, lastlandIndex));
          });

          it('adds the land to the lands list of the new owner', async function () {
            await land.transfer(to, parcelId, { from: sender });

            const landIDs = await land.landsOf(to);
            landIDs.length.should.be.equal(1);
            landIDs[0].should.be.bignumber.equal(parcelId);
          });
        });

        describe('when the msg.sender is not the owner of the given land ID', function () {
          const sender = anotherUser;

          it('reverts', async function () {
            await assertRevert(land.transfer(to, parcelId, { from: sender }));
          });
        });
      });

      describe('when the given land ID was not tracked by this land', function () {
        let parcelId = _unknownparcelId;

        it('reverts', async function () {
          await assertRevert(land.transfer(to, parcelId, { from: creator }));
        });
      });
    });

    describe('when the address to transfer the land to is the zero address', function () {
      const to = 0x0;

      it('reverts', async function () {
        await assertRevert(land.transfer(to, 0, { from: creator }));
      });
    });
  });

  describe('approve', function () {
    describe('when the given land ID was already tracked by this contract', function () {
      const parcelId = _firstparcelId;

      describe('when the sender owns the given land ID', function () {
        const sender = creator;

        describe('when the address that receives the approval is the 0 address', function () {
          const to = NONE;

          describe('when there was no approval for the given land ID before', function () {
            it('clears the approval for that land', async function () {
              await land.approve(to, parcelId, { from: sender });

              const approvedAccount = await land.approvedFor(parcelId);
              approvedAccount.should.be.equal(to);
            });

            it('emits an approval event to 0', async function () {
              const { logs } = await land.approve(to, parcelId, { from: sender });
              logs.length.should.be.equal(1);
              checkApproveLog(logs[0], parcelId, sender, NONE);
            });
          });

          describe('when the given land ID was approved for another account', function () {
            beforeEach(async function () {
              await land.approve(anotherUser, parcelId, { from: sender });
            });

            it('clears the approval for the land ID', async function () {
              await land.approve(to, parcelId, { from: sender });

              const approvedAccount = await land.approvedFor(parcelId);
              approvedAccount.should.be.equal(to);
            });

            it('emits an approval event', async function () {
              const { logs } = await land.approve(to, parcelId, { from: sender });

              checkApproveLog(logs[0], parcelId, sender, to);
              logs.length.should.be.equal(1);
            });
          });
        });

        describe('when the address that receives the approval is not the 0 address', function () {
          describe('when the address that receives the approval is different than the owner', function () {
            const to = user;

            describe('when there was no approval for the given land ID before', function () {
              it('approves the land ID to the given address', async function () {
                await land.approve(to, parcelId, { from: sender });

                const approvedAccount = await land.approvedFor(parcelId);
                approvedAccount.should.be.equal(to);
              });

              it('emits an approval event', async function () {
                const { logs } = await land.approve(to, parcelId, { from: sender });

                logs.length.should.be.equal(1);
                checkApproveLog(logs[0], parcelId, sender, to);
              });
            });

            describe('when the given land ID was approved for the same account', function () {
              beforeEach(async function () {
                await land.approve(to, parcelId, { from: sender });
              });

              it('keeps the approval to the given address', async function () {
                await land.approve(to, parcelId, { from: sender });

                const approvedAccount = await land.approvedFor(parcelId);
                approvedAccount.should.be.equal(to);
              });

              it('emits an approval event', async function () {
                const { logs } = await land.approve(to, parcelId, { from: sender });

                logs.length.should.be.equal(1);
                checkApproveLog(logs[0], parcelId, sender, to);
              });
            });

            describe('when the given land ID was approved for another account', function () {
              beforeEach(async function () {
                await land.approve(anotherUser, parcelId, { from: sender });
              });

              it('changes the approval to the given address', async function () {
                await land.approve(to, parcelId, { from: sender });

                const approvedAccount = await land.approvedFor(parcelId);
                approvedAccount.should.be.equal(to);
              });

              it('emits an approval event', async function () {
                const { logs } = await land.approve(to, parcelId, { from: sender });

                logs.length.should.be.equal(1);
                checkApproveLog(logs[0], parcelId, sender, to);
              });
            });
          });

          describe('when the address that receives the approval is the owner', function () {
            const to = creator;

            describe('when there was no approval for the given land ID before', function () {
              it('reverts', async function () {
                await assertRevert(land.approve(to, parcelId, { from: sender }));
              });
            });

            describe('when the given land ID was approved for another account', function () {
              beforeEach(async function () {
                await land.approve(anotherUser, parcelId, { from: sender });
              });

              it('reverts', async function () {
                await assertRevert(land.approve(to, parcelId, { from: sender }));
              });
            });
          });
        });
      });

      describe('when the sender does not own the given land ID', function () {
        const sender = user;

        it('reverts', async function () {
          await assertRevert(land.approve(anotherUser, parcelId, { from: sender }));
        });
      });
    });

    describe('when the given land ID was not tracked by the contract before', function () {
      const parcelId = _unknownparcelId;

      it('reverts', async function () {
        await assertRevert(land.approve(user, parcelId, { from: creator }));
      });
    });
  });

  describe('takeOwnership', function () {
    describe('when the given land ID was already tracked by this contract', function () {
      const parcelId = _firstparcelId;

      describe('when the sender has the approval for the land ID', function () {
        const sender = user;

        beforeEach(async function () {
          await land.approve(sender, parcelId, { from: creator });
        });

        it('transfers the ownership of the given land ID to the given address', async function () {
          await land.takeOwnership(parcelId, { from: sender });

          const newOwner = await land.ownerOf(parcelId);
          newOwner.should.be.equal(sender);
        });

        it('clears the approval for the land ID', async function () {
          await land.takeOwnership(parcelId, { from: sender });

          const approvedAccount = await land.approvedFor(parcelId);
          approvedAccount.should.be.equal(NONE);
        });

        it('emits an approval and transfer events', async function () {
          const { logs } = await land.takeOwnership(parcelId, { from: sender });

          logs.length.should.be.equal(2);

          checkApproveLog(logs[0], parcelId, creator, NONE);
          checkTransferLog(logs[1], parcelId, creator, sender);
        });

        it('adjusts owners balances', async function () {
          const previousBalance = await land.balanceOf(creator);

          await land.takeOwnership(parcelId, { from: sender });

          const newOwnerBalance = await land.balanceOf(sender);
          newOwnerBalance.should.be.bignumber.equal(1);

          const previousOwnerBalance = await land.balanceOf(creator);
          previousOwnerBalance.should.be.bignumber.equal(previousBalance - 1);
        });

        it('places the last land of the sender in the position of the transferred land', async function () {
          const firstlandIndex = 0;
          const lastlandIndex = await land.balanceOf(creator) - 1;
          const lastland = await land.landOfOwnerByIndex(creator, lastlandIndex);

          await land.takeOwnership(parcelId, { from: sender });

          const swappedland = await land.landOfOwnerByIndex(creator, firstlandIndex);
          swappedland.should.be.bignumber.equal(lastland);
          await assertRevert(land.landOfOwnerByIndex(creator, lastlandIndex));
        });

        it('adds the land to the lands list of the new owner', async function () {
          await land.takeOwnership(parcelId, { from: sender });

          const landIDs = await land.landsOf(sender);
          landIDs.length.should.be.equal(1);
          landIDs[0].should.be.bignumber.equal(parcelId);
        });
      });

      describe('when the sender does not have the approval for the land ID', function () {
        const sender = user;

        it('reverts', async function () {
          await assertRevert(land.takeOwnership(parcelId, { from: sender }));
        });
      });

      describe('when the sender is already the owner of the land', function () {
        const sender = creator;

        it('reverts', async function () {
          await assertRevert(land.takeOwnership(parcelId, { from: sender }));
        });
      });
    });

    describe('when the given land ID was not tracked by the contract before', function () {
      const parcelId = _unknownparcelId;

      it('reverts', async function () {
        await assertRevert(land.takeOwnership(parcelId, { from: creator }));
      });
    });
  });
});
